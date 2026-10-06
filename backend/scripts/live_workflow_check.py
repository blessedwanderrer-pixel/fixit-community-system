"""Run the real FixIt Auth, API workflow, persistence, and RLS checks."""

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
from app.main import app


@dataclass
class LiveResults:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    def check(self, name: str, condition: bool, detail: str = "") -> bool:
        if condition:
            self.passed.append(name)
            print(f"PASS {name}")
            return True
        safe_detail = f" ({detail})" if detail else ""
        self.failed.append(name)
        print(f"FAIL {name}{safe_detail}")
        return False


def response_detail(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return f"HTTP {response.status_code}"
    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message") or payload.get("error_code")
        if detail:
            return f"HTTP {response.status_code}: {detail}"
    return f"HTTP {response.status_code}"


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    results = LiveResults()

    passwords = {
        "citizen": os.getenv("FIXIT_TEST_CITIZEN_PASSWORD"),
        "admin": os.getenv("FIXIT_TEST_ADMIN_PASSWORD"),
        "coordinator": os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD"),
    }
    if not all(passwords.values()):
        print("FAIL credentials: one or more test password variables are missing")
        return 1
    if not settings.supabase_url or not settings.supabase_publishable_key:
        print("FAIL configuration: Supabase URL or publishable key is missing")
        return 1

    base_url = settings.supabase_url.rstrip("/")
    emails = {
        "citizen": "citizen@fixit.test",
        "admin": "admin@fixit.test",
        "coordinator": "coordinator@fixit.test",
    }
    tokens: dict[str, str] = {}
    auth_headers = {"apikey": settings.supabase_publishable_key}

    with httpx.Client(timeout=settings.supabase_request_timeout_seconds) as live_client:
        for role in ("citizen", "admin", "coordinator"):
            response = live_client.post(
                f"{base_url}/auth/v1/token",
                headers=auth_headers,
                params={"grant_type": "password"},
                json={"email": emails[role], "password": passwords[role]},
            )
            ok = response.status_code == 200 and bool(response.json().get("access_token"))
            results.check(f"authenticate {role}", ok, response_detail(response))
            if not ok:
                print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
                return 1
            tokens[role] = response.json()["access_token"]

        api_client = TestClient(app)
        for expected_role in ("citizen", "admin", "coordinator"):
            response = api_client.get(
                "/api/me",
                headers={"Authorization": f"Bearer {tokens[expected_role]}"},
            )
            ok = response.status_code == 200 and response.json().get("role") == expected_role
            results.check(
                f"GET /api/me returns {expected_role}", ok, response_detail(response)
            )
            if not ok:
                print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
                return 1

        unique_suffix = uuid4().hex
        create_response = api_client.post(
            "/api/reports",
            headers={"Authorization": f"Bearer {tokens['citizen']}"},
            json={
                "description": f"Live integration report {unique_suffix}",
                "category": "Live Integration Test",
                "latitude": 31.5204,
                "longitude": 74.3587,
                "photo_reference": f"live-tests/{unique_suffix}/report.jpg",
            },
        )
        created = create_response.json() if create_response.status_code == 201 else {}
        report_id = created.get("id")
        tracking_id = created.get("tracking_id")
        created_ok = (
            create_response.status_code == 201
            and bool(report_id)
            and isinstance(tracking_id, str)
            and tracking_id.startswith("FIX-")
        )
        results.check("citizen creates report with tracking ID", created_ok, response_detail(create_response))
        if not created_ok:
            print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
            return 1
        print(f"TRACKING_ID {tracking_id}")

        def user_headers(role: str) -> dict[str, str]:
            return {
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {tokens[role]}",
            }

        citizen_db_response = live_client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("citizen"),
            params={"select": "id,tracking_id,status", "id": f"eq.{report_id}"},
        )
        citizen_rows = citizen_db_response.json() if citizen_db_response.status_code == 200 else []
        results.check(
            "citizen JWT reads and persists own report/tracking ID",
            len(citizen_rows) == 1
            and citizen_rows[0].get("tracking_id") == tracking_id
            and citizen_rows[0].get("status") == "Submitted",
            response_detail(citizen_db_response),
        )

        coordinator_private_response = live_client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("coordinator"),
            params={"select": "id", "id": f"eq.{report_id}"},
        )
        coordinator_private_rows = (
            coordinator_private_response.json()
            if coordinator_private_response.status_code == 200
            else None
        )
        results.check(
            "RLS blocks unassigned coordinator from private submitted report",
            coordinator_private_response.status_code == 200
            and coordinator_private_rows == [],
            response_detail(coordinator_private_response),
        )

        coordinator_direct_update = live_client.patch(
            f"{base_url}/rest/v1/problem_reports",
            headers={
                **user_headers("coordinator"),
                "Prefer": "return=representation",
                "Content-Type": "application/json",
            },
            params={"id": f"eq.{report_id}"},
            json={"status": "Approved"},
        )
        direct_update_rows: Any = (
            coordinator_direct_update.json()
            if coordinator_direct_update.status_code in {200, 204}
            and coordinator_direct_update.content
            else []
        )
        unchanged_response = live_client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("citizen"),
            params={"select": "status", "id": f"eq.{report_id}"},
        )
        unchanged_rows = unchanged_response.json() if unchanged_response.status_code == 200 else []
        results.check(
            "RLS blocks coordinator direct report approval",
            coordinator_direct_update.status_code in {200, 204}
            and direct_update_rows == []
            and len(unchanged_rows) == 1
            and unchanged_rows[0].get("status") == "Submitted",
            response_detail(coordinator_direct_update),
        )

        submitted_response = api_client.get(
            "/api/admin/reports/submitted",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        submitted_rows = submitted_response.json() if submitted_response.status_code == 200 else []
        results.check(
            "admin sees submitted report",
            any(item.get("id") == report_id for item in submitted_rows),
            response_detail(submitted_response),
        )

        coordinator_admin_response = api_client.post(
            f"/api/admin/reports/{report_id}/decision",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"status": "Approved"},
        )
        results.check(
            "coordinator cannot use admin approval endpoint",
            coordinator_admin_response.status_code == 403,
            response_detail(coordinator_admin_response),
        )

        approve_response = api_client.post(
            f"/api/admin/reports/{report_id}/decision",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
            json={"status": "Approved"},
        )
        results.check(
            "admin approves submitted report",
            approve_response.status_code == 200
            and approve_response.json().get("status") == "Approved",
            response_detail(approve_response),
        )

        coordinator_list_response = api_client.get(
            "/api/coordinator/reports",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
        )
        coordinator_reports = (
            coordinator_list_response.json() if coordinator_list_response.status_code == 200 else []
        )
        results.check(
            "coordinator sees approved report through backend",
            any(item.get("id") == report_id for item in coordinator_reports),
            response_detail(coordinator_list_response),
        )

        schedule_response = api_client.post(
            f"/api/coordinator/reports/{report_id}/schedule",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"scheduled_for": "2026-10-05T09:00:00Z", "work_details": "Live test schedule"},
        )
        results.check(
            "coordinator schedules approved report",
            schedule_response.status_code == 200
            and schedule_response.json().get("status") == "Scheduled",
            response_detail(schedule_response),
        )

        coordinator_assigned_response = live_client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("coordinator"),
            params={"select": "id,status", "id": f"eq.{report_id}"},
        )
        assigned_rows = (
            coordinator_assigned_response.json()
            if coordinator_assigned_response.status_code == 200
            else []
        )
        results.check(
            "RLS allows assigned coordinator to read scheduled report",
            len(assigned_rows) == 1 and assigned_rows[0].get("status") == "Scheduled",
            response_detail(coordinator_assigned_response),
        )

        progress_response = api_client.post(
            f"/api/coordinator/reports/{report_id}/status",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"status": "In Progress", "work_details": "Live test work started"},
        )
        results.check(
            "coordinator moves report to In Progress",
            progress_response.status_code == 200
            and progress_response.json().get("status") == "In Progress",
            response_detail(progress_response),
        )

        premature_solve = api_client.post(
            f"/api/coordinator/reports/{report_id}/status",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"status": "Solved"},
        )
        results.check(
            "Solved rejected without Before and After evidence",
            premature_solve.status_code == 409
            and premature_solve.json().get("detail") == "MISSING_BEFORE_AFTER_EVIDENCE",
            response_detail(premature_solve),
        )

        for stage in ("before", "after"):
            evidence_response = api_client.post(
                f"/api/coordinator/reports/{report_id}/evidence",
                headers={"Authorization": f"Bearer {tokens['coordinator']}"},
                json={
                    "stage": stage,
                    "photo_reference": f"live-tests/{unique_suffix}/{stage}.jpg",
                },
            )
            results.check(
                f"coordinator records {stage} evidence reference",
                evidence_response.status_code == 200
                and evidence_response.json().get("stage") == stage,
                response_detail(evidence_response),
            )

        solved_response = api_client.post(
            f"/api/coordinator/reports/{report_id}/status",
            headers={"Authorization": f"Bearer {tokens['coordinator']}"},
            json={"status": "Solved", "work_details": "Live test work completed"},
        )
        results.check(
            "coordinator moves evidenced report to Solved",
            solved_response.status_code == 200
            and solved_response.json().get("status") == "Solved",
            response_detail(solved_response),
        )

        final_response = live_client.get(
            f"{base_url}/rest/v1/problem_reports",
            headers=user_headers("citizen"),
            params={
                "select": "id,tracking_id,status,report_media(stage,storage_object_path),work_records(started_at,completed_at,notes)",
                "id": f"eq.{report_id}",
            },
        )
        final_rows = final_response.json() if final_response.status_code == 200 else []
        final_row = final_rows[0] if len(final_rows) == 1 else {}
        final_stages = {
            item.get("stage") for item in final_row.get("report_media", []) if isinstance(item, dict)
        }
        work_rows = final_row.get("work_records", [])
        results.check(
            "final Solved state and evidence persisted through citizen JWT",
            final_row.get("tracking_id") == tracking_id
            and final_row.get("status") == "Solved"
            and {"report", "before", "after"}.issubset(final_stages)
            and len(work_rows) >= 1
            and any(item.get("completed_at") for item in work_rows),
            response_detail(final_response),
        )

        print(f"FINAL_STATUS {final_row.get('status', 'UNKNOWN')}")
        print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
        return 1 if results.failed else 0


if __name__ == "__main__":
    sys.exit(main())
