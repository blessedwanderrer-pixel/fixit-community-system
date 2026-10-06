"""Live duplicate detection, Admin merge, RLS, and Groq triage verification."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from app.core.config import BACKEND_DIR, get_settings
from app.core.duplicate_detection import haversine_distance_meters
from app.main import app
from app.services.triage import GroqTriageService


@dataclass
class Results:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    def check(self, name: str, condition: bool, detail: str = "") -> bool:
        if condition:
            self.passed.append(name)
            print(f"PASS {name}")
            return True
        self.failed.append(name)
        suffix = f" ({detail})" if detail else ""
        print(f"FAIL {name}{suffix}")
        return False


def safe_detail(response: Any) -> str:
    try:
        payload = response.json()
    except Exception:
        return f"HTTP {response.status_code}"
    if isinstance(payload, dict):
        message = payload.get("detail") or payload.get("message") or payload.get("code")
        if message:
            return f"HTTP {response.status_code}: {message}"
    return f"HTTP {response.status_code}"


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    results = Results()

    required = {
        "citizen": os.getenv("FIXIT_TEST_CITIZEN_PASSWORD"),
        "admin": os.getenv("FIXIT_TEST_ADMIN_PASSWORD"),
        "coordinator": os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD"),
    }
    if not all(required.values()) or not settings.groq_api_key:
        print("FAIL configuration: test passwords or GROQ_API_KEY missing")
        return 1
    if not settings.supabase_url or not settings.supabase_publishable_key or not settings.supabase_secret_key:
        print("FAIL configuration: Supabase settings missing")
        return 1

    base_url = settings.supabase_url.rstrip("/")
    emails = {
        "citizen": "citizen@fixit.test",
        "admin": "admin@fixit.test",
        "coordinator": "coordinator@fixit.test",
    }
    service_headers = {"apikey": settings.supabase_secret_key, "Content-Type": "application/json"}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"

    tokens: dict[str, str] = {}
    user_ids: dict[str, str] = {}
    api_client = TestClient(app)
    run_id = uuid4().hex[:12]
    base_latitude = 31.5204
    base_longitude = 74.3587
    near_latitude = base_latitude + 0.0005
    far_latitude = base_latitude + 0.0015
    near_haversine = haversine_distance_meters(
        base_latitude, base_longitude, near_latitude, base_longitude
    )
    far_haversine = haversine_distance_meters(
        base_latitude, base_longitude, far_latitude, base_longitude
    )

    with httpx.Client(timeout=settings.supabase_request_timeout_seconds) as client:
        for role in ("citizen", "admin", "coordinator"):
            response = client.post(
                f"{base_url}/auth/v1/token",
                headers={"apikey": settings.supabase_publishable_key},
                params={"grant_type": "password"},
                json={"email": emails[role], "password": required[role]},
            )
            ok = response.status_code == 200 and bool(response.json().get("access_token"))
            results.check(f"authenticate {role}", ok, safe_detail(response))
            if not ok:
                return 1
            tokens[role] = response.json()["access_token"]
            me = api_client.get(
                "/api/me", headers={"Authorization": f"Bearer {tokens[role]}"}
            )
            if not results.check(
                f"load {role} profile",
                me.status_code == 200 and me.json().get("role") == role,
                safe_detail(me),
            ):
                return 1
            user_ids[role] = me.json()["id"]

        def user_headers(role: str) -> dict[str, str]:
            return {
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {tokens[role]}",
            }

        def rpc(name: str, payload: dict[str, Any]) -> dict[str, Any]:
            response = client.post(
                f"{base_url}/rest/v1/rpc/{name}", headers=service_headers, json=payload
            )
            if response.status_code not in {200, 201}:
                raise RuntimeError(f"{name} failed safely: {safe_detail(response)}")
            value = response.json()
            if not isinstance(value, dict):
                raise RuntimeError(f"{name} returned a non-object response")
            return value

        def create_db_report(
            category: str, latitude: float, longitude: float = base_longitude
        ) -> dict[str, Any]:
            return rpc(
                "fixit_create_report",
                {
                    "p_citizen_id": user_ids["citizen"],
                    "p_description": f"Live duplicate test {category}",
                    "p_category": category,
                    "p_latitude": latitude,
                    "p_longitude": longitude,
                    "p_photo_reference": f"live-duplicate/{run_id}/{uuid4().hex}.jpg",
                },
            )

        def admin_decide(report_id: str, decision: str) -> None:
            response = api_client.post(
                f"/api/admin/reports/{report_id}/decision",
                headers={"Authorization": f"Bearer {tokens['admin']}"},
                json={"status": decision},
            )
            if response.status_code != 200:
                raise RuntimeError(f"admin decision failed safely: {safe_detail(response)}")

        def schedule_and_optionally_start(report_id: str, start: bool) -> None:
            schedule = api_client.post(
                f"/api/coordinator/reports/{report_id}/schedule",
                headers={"Authorization": f"Bearer {tokens['coordinator']}"},
                json={"scheduled_for": "2026-10-05T09:00:00Z"},
            )
            if schedule.status_code != 200:
                raise RuntimeError(f"schedule failed safely: {safe_detail(schedule)}")
            if start:
                progress = api_client.post(
                    f"/api/coordinator/reports/{report_id}/status",
                    headers={"Authorization": f"Bearer {tokens['coordinator']}"},
                    json={"status": "In Progress"},
                )
                if progress.status_code != 200:
                    raise RuntimeError(f"progress failed safely: {safe_detail(progress)}")

        main_category = f"Live-Duplicate-{run_id}"
        target = create_db_report(main_category, base_latitude)
        duplicate = create_db_report(main_category, near_latitude)
        results.check(
            "same category within 100m returns Possible Duplicate",
            duplicate.get("possible_duplicate") is True
            and duplicate.get("duplicate_candidate_count") == 1,
        )
        results.check(
            "possible duplicate is not automatically merged",
            duplicate.get("merged_into_report_id") is None
            and duplicate.get("status") == "Submitted",
        )

        candidate_response = client.get(
            f"{base_url}/rest/v1/report_duplicate_candidates",
            headers=user_headers("admin"),
            params={
                "select": "id,report_id,candidate_report_id,distance_meters,status",
                "report_id": f"eq.{duplicate['id']}",
                "candidate_report_id": f"eq.{target['id']}",
            },
        )
        candidate_rows = candidate_response.json() if candidate_response.status_code == 200 else []
        exact_distance = candidate_rows[0]["distance_meters"] if len(candidate_rows) == 1 else None
        results.check(
            "Admin JWT sees persisted Possible Duplicate candidate",
            len(candidate_rows) == 1
            and candidate_rows[0].get("status") == "Possible Duplicate"
            and exact_distance is not None
            and exact_distance <= 100,
            safe_detail(candidate_response),
        )
        if exact_distance is not None:
            print(f"DISTANCE_NEAR_METERS {exact_distance:.6f}")

        citizen_candidates = client.get(
            f"{base_url}/rest/v1/report_duplicate_candidates",
            headers=user_headers("citizen"),
            params={"select": "*", "report_id": f"eq.{duplicate['id']}"},
        )
        results.check(
            "Citizen RLS cannot read duplicate candidate/private report details",
            citizen_candidates.status_code == 200 and citizen_candidates.json() == [],
            safe_detail(citizen_candidates),
        )
        results.check(
            "Citizen creation result exposes no candidate report identity",
            "candidate_report_id" not in duplicate and "duplicate_candidates" not in duplicate,
        )

        far = create_db_report(main_category, far_latitude)
        results.check(
            "same category over 100m is not a duplicate candidate",
            far.get("possible_duplicate") is False
            and far.get("duplicate_candidate_count") == 0,
        )
        print(f"DISTANCE_FAR_METERS_APPROX {far_haversine:.6f}")

        different = create_db_report(f"Different-{run_id}", near_latitude)
        results.check(
            "different category within 100m is not a duplicate candidate",
            different.get("possible_duplicate") is False
            and different.get("duplicate_candidate_count") == 0,
        )
        print(f"DISTANCE_DIFFERENT_CATEGORY_METERS_APPROX {near_haversine:.6f}")

        # Verify each active status independently with an isolated category.
        for status_name in ("Submitted", "Approved", "Scheduled", "In Progress"):
            category = f"Active-{status_name.replace(' ', '-')}-{run_id}"
            existing = create_db_report(category, base_latitude)
            if status_name in {"Approved", "Scheduled", "In Progress"}:
                admin_decide(existing["id"], "Approved")
            if status_name in {"Scheduled", "In Progress"}:
                schedule_and_optionally_start(existing["id"], status_name == "In Progress")
            probe = create_db_report(category, near_latitude)
            results.check(
                f"active status {status_name} participates in duplicate detection",
                probe.get("possible_duplicate") is True,
            )

        # Verify each inactive status independently with an isolated category.
        rejected_category = f"Inactive-Rejected-{run_id}"
        rejected = create_db_report(rejected_category, base_latitude)
        admin_decide(rejected["id"], "Rejected")
        rejected_probe = create_db_report(rejected_category, near_latitude)
        results.check(
            "inactive status Rejected excluded from duplicate detection",
            rejected_probe.get("possible_duplicate") is False,
        )

        cancelled_category = f"Inactive-Cancelled-{run_id}"
        cancelled = create_db_report(cancelled_category, base_latitude)
        cancel_response = api_client.post(
            f"/api/reports/{cancelled['id']}/cancel",
            headers={"Authorization": f"Bearer {tokens['citizen']}"},
        )
        if cancel_response.status_code != 200:
            raise RuntimeError(f"cancel failed safely: {safe_detail(cancel_response)}")
        cancelled_probe = create_db_report(cancelled_category, near_latitude)
        results.check(
            "inactive status Cancelled excluded from duplicate detection",
            cancelled_probe.get("possible_duplicate") is False,
        )

        solved_category = f"Inactive-Solved-{run_id}"
        solved = create_db_report(solved_category, base_latitude)
        admin_decide(solved["id"], "Approved")
        schedule_and_optionally_start(solved["id"], True)
        for stage in ("before", "after"):
            evidence = api_client.post(
                f"/api/coordinator/reports/{solved['id']}/evidence",
                headers={"Authorization": f"Bearer {tokens['coordinator']}"},
                json={
                    "stage": stage,
                    "photo_reference": f"live-duplicate/{run_id}/{stage}-{uuid4().hex}.jpg",
                },
            )
            if evidence.status_code != 200:
                raise RuntimeError(f"evidence failed safely: {safe_detail(evidence)}")
        solve_response = api_client.post(
            f"/api/coordinator/reports/{solved['id']}/status",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"status": "Solved"},
        )
        if solve_response.status_code != 200:
            raise RuntimeError(f"solve failed safely: {safe_detail(solve_response)}")
        solved_probe = create_db_report(solved_category, near_latitude)
        results.check(
            "inactive status Solved excluded from duplicate detection",
            solved_probe.get("possible_duplicate") is False,
        )

        review = api_client.get(
            f"/api/admin/reports/{duplicate['id']}/review",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        review_body = review.json() if review.status_code == 200 else {}
        results.check(
            "Admin reviews real duplicate candidate",
            review.status_code == 200
            and len(review_body.get("duplicate_candidates", [])) == 1
            and review_body["duplicate_candidates"][0]["candidate_report"]["id"] == target["id"],
            safe_detail(review),
        )

        merge = api_client.post(
            f"/api/admin/reports/{duplicate['id']}/merge",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"target_report_id": target["id"]},
        )
        merge_body = merge.json() if merge.status_code == 200 else {}
        results.check(
            "Admin performs final merge",
            merge.status_code == 200
            and merge_body.get("merged_report_id") == duplicate["id"]
            and merge_body.get("target_report", {}).get("id") == target["id"],
            safe_detail(merge),
        )

        source_response = client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("citizen"),
            params={
                "select": "id,status,merged_into_report_id,status_changed_by",
                "id": f"eq.{duplicate['id']}",
            },
        )
        source_rows = source_response.json() if source_response.status_code == 200 else []
        results.check(
            "merge relationship and Admin actor persisted",
            len(source_rows) == 1
            and source_rows[0].get("status") == "Cancelled"
            and source_rows[0].get("merged_into_report_id") == target["id"]
            and source_rows[0].get("status_changed_by") == user_ids["admin"],
            safe_detail(source_response),
        )

        reporter_response = client.get(
            f"{base_url}/rest/v1/report_reporters",
            headers=user_headers("citizen"),
            params={
                "select": "report_id,citizen_id,source_report_id",
                "report_id": f"eq.{target['id']}",
                "citizen_id": f"eq.{user_ids['citizen']}",
            },
        )
        reporter_rows = reporter_response.json() if reporter_response.status_code == 200 else []
        target_visibility = client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("citizen"),
            params={"select": "id,status", "id": f"eq.{target['id']}"},
        )
        results.check(
            "reporter preserved and Citizen RLS visibility remains after merge",
            len(reporter_rows) == 1
            and reporter_rows[0].get("report_id") == target["id"]
            and target_visibility.status_code == 200
            and len(target_visibility.json()) == 1,
            safe_detail(reporter_response),
        )
        results.check(
            "merge was not automatic and was recorded as Admin-reviewed",
            bool(candidate_rows)
            and candidate_rows[0].get("status") == "Possible Duplicate"
            and merge.status_code == 200,
        )
        print(f"REPORTERS_PRESERVED {merge_body.get('reporters_preserved', 'UNKNOWN')}")

        # Exactly one backend submission invokes one real Groq triage call.
        original_analyze = GroqTriageService.analyze
        groq_calls = {"count": 0}

        async def counted_analyze(self: GroqTriageService, report: Any) -> Any:
            groq_calls["count"] += 1
            return await original_analyze(self, report)

        GroqTriageService.analyze = counted_analyze
        ai_category = f"AI-Live-{run_id}"
        try:
            ai_response = api_client.post(
                "/api/reports",
                headers={"Authorization": f"Bearer {tokens['citizen']}"},
                json={
                    "description": "A damaged public water pipe is leaking into the street.",
                    "category": ai_category,
                    "latitude": 30.0,
                    "longitude": 70.0,
                    "photo_reference": f"live-ai/{run_id}/report.jpg",
                },
            )
        finally:
            GroqTriageService.analyze = original_analyze

        ai_body = ai_response.json() if ai_response.status_code == 201 else {}
        ai_report_id = ai_body.get("id")
        results.check(
            "real Groq triage request completes through backend",
            ai_response.status_code == 201
            and ai_body.get("ai_triage_status") == "completed"
            and groq_calls["count"] == 1,
            safe_detail(ai_response),
        )
        results.check("exactly one Groq triage attempt made", groq_calls["count"] == 1)

        if ai_report_id:
            ai_review = api_client.get(
                f"/api/admin/reports/{ai_report_id}/review",
                headers={"Authorization": f"Bearer {tokens['admin']}"},
            )
            ai_review_body = ai_review.json() if ai_review.status_code == 200 else {}
            triage_record = ai_review_body.get("ai_triage") or {}
            triage_result = triage_record.get("result") or {}
            expected_fields = {
                "short_summary",
                "suggested_category",
                "priority",
                "community_private_scope",
                "recommendation",
                "reason",
            }
            results.check(
                "real Groq result contains all validated fields",
                ai_review.status_code == 200 and set(triage_result) == expected_fields,
                safe_detail(ai_review),
            )
            print("GROQ_RESULT_FIELDS " + ",".join(sorted(triage_result)))
            for field_name in sorted(expected_fields):
                print(f"GROQ_{field_name.upper()} {triage_result.get(field_name, '')}")

            admin_ai_rows_response = client.get(
                f"{base_url}/rest/v1/ai_triage_results",
                headers=user_headers("admin"),
                params={"select": "id,report_id,result", "report_id": f"eq.{ai_report_id}"},
            )
            admin_ai_rows = (
                admin_ai_rows_response.json()
                if admin_ai_rows_response.status_code == 200
                else []
            )
            results.check(
                "validated Groq result persisted in ai_triage_results",
                len(admin_ai_rows) == 1
                and set(admin_ai_rows[0].get("result", {})) == expected_fields,
                safe_detail(admin_ai_rows_response),
            )

            citizen_ai_rows = client.get(
                f"{base_url}/rest/v1/ai_triage_results",
                headers=user_headers("citizen"),
                params={"select": "id", "report_id": f"eq.{ai_report_id}"},
            )
            results.check(
                "Citizen RLS cannot read private AI triage record",
                citizen_ai_rows.status_code == 200 and citizen_ai_rows.json() == [],
                safe_detail(citizen_ai_rows),
            )

            ai_report_state = client.get(
                f"{base_url}/rest/v1/problem_reports",
                headers=user_headers("citizen"),
                params={
                    "select": "status,merged_into_report_id,status_changed_by",
                    "id": f"eq.{ai_report_id}",
                },
            )
            state_rows = ai_report_state.json() if ai_report_state.status_code == 200 else []
            results.check(
                "AI did not approve reject merge or change report status",
                len(state_rows) == 1
                and state_rows[0].get("status") == "Submitted"
                and state_rows[0].get("merged_into_report_id") is None
                and state_rows[0].get("status_changed_by") is None,
                safe_detail(ai_report_state),
            )
            results.check(
                "AI result has no final-decision field",
                not ({"status", "approved", "rejected", "merged"} & set(triage_result)),
            )

        print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
        return 1 if results.failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        # Exception text is safe workflow/API context only; credentials and tokens
        # are never included in constructed error messages.
        print(f"FAIL live integration aborted safely: {exc}")
        sys.exit(1)
