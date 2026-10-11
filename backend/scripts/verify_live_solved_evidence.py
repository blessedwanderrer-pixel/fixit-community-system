"""Focused production check for the Solved evidence invariant.

Creates temporary reports through the public API, exercises the coordinator
workflow, and removes the created database rows and Storage objects afterward.
"""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from PIL import Image

from app.core.config import BACKEND_DIR, get_settings


API_URL = os.getenv("FIXIT_API_BASE_URL", "https://fixit-community-api.vercel.app").rstrip("/")


def png(color: str) -> bytes:
    output = BytesIO()
    Image.new("RGB", (24, 24), color).save(output, "PNG")
    return output.getvalue()


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    passwords = {
        "citizen": os.getenv("FIXIT_TEST_CITIZEN_PASSWORD"),
        "admin": os.getenv("FIXIT_TEST_ADMIN_PASSWORD"),
        "coordinator": os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD"),
    }
    if not all(passwords.values()) or not all(
        (settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key)
    ):
        print("FAIL missing live verification configuration")
        return 1

    supabase_url = settings.supabase_url.rstrip("/")
    service_headers = {"apikey": settings.supabase_secret_key}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"

    created_reports: list[str] = []
    created_objects: list[str] = []
    run_id = uuid4().hex[:10]
    failures: list[str] = []
    checks = 0

    with httpx.Client(timeout=30) as client:
        tokens: dict[str, str] = {}
        user_ids: dict[str, str] = {}
        for role, password in passwords.items():
            response = client.post(
                f"{supabase_url}/auth/v1/token",
                headers={"apikey": settings.supabase_publishable_key},
                params={"grant_type": "password"},
                json={"email": f"{role}@fixit.test", "password": password},
            )
            response.raise_for_status()
            tokens[role] = response.json()["access_token"]

        def auth(role: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {tokens[role]}"}

        for role in tokens:
            profile = client.get(f"{API_URL}/api/me", headers=auth(role))
            profile.raise_for_status()
            user_ids[role] = profile.json()["id"]

        def persisted_status(report_id: str) -> str | None:
            response = client.get(
                f"{supabase_url}/rest/v1/problem_reports",
                headers=service_headers,
                params={"select": "status", "id": f"eq.{report_id}", "limit": "1"},
            )
            response.raise_for_status()
            rows = response.json()
            return rows[0]["status"] if rows else None

        def expect(label: str, report_id: str, response: httpx.Response, allowed: bool) -> None:
            nonlocal checks
            checks += 1
            body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            actual = response.status_code == 200 and body.get("status") == "Solved"
            stored_status = persisted_status(report_id)
            persisted_as_expected = stored_status == ("Solved" if allowed else "In Progress")
            passed = actual is allowed and persisted_as_expected
            print(
                f"{'PASS' if passed else 'FAIL'} {label}: HTTP {response.status_code} "
                f"response_status={body.get('status')} persisted_status={stored_status} "
                f"detail={body.get('detail')}"
            )
            if not passed:
                failures.append(label)

        def expect_database_block(label: str, response: httpx.Response) -> None:
            nonlocal checks
            checks += 1
            try:
                body = response.json()
            except ValueError:
                body = {}
            blocked = response.status_code >= 400 and body.get("message") == "MISSING_BEFORE_AFTER_EVIDENCE"
            print(
                f"{'PASS' if blocked else 'FAIL'} {label}: HTTP {response.status_code} "
                f"message={body.get('message')}"
            )
            if not blocked:
                failures.append(label)

        def create_active_report(label: str) -> str:
            response = client.post(
                f"{API_URL}/api/reports/with-photo",
                headers=auth("citizen"),
                data={
                    "description": f"Temporary solved-evidence verification {label} {run_id}",
                    "category": f"Evidence-Check-{run_id}-{label}",
                    "latitude": "31.5204",
                    "longitude": "74.3587",
                },
                files={"photo": ("report.png", png("navy"), "image/png")},
            )
            response.raise_for_status()
            report_id = response.json()["id"]
            created_reports.append(report_id)
            for path, role, payload in (
                (f"/api/admin/reports/{report_id}/decision", "admin", {"status": "Approved"}),
                (
                    f"/api/coordinator/reports/{report_id}/schedule",
                    "coordinator",
                    {"scheduled_for": (datetime.now(UTC) + timedelta(minutes=5)).isoformat()},
                ),
                (
                    f"/api/coordinator/reports/{report_id}/status",
                    "coordinator",
                    {"status": "In Progress"},
                ),
            ):
                step = client.post(f"{API_URL}{path}", headers=auth(role), json=payload)
                step.raise_for_status()
            return report_id

        def upload(report_id: str, stage: str) -> str:
            response = client.post(
                f"{API_URL}/api/coordinator/reports/{report_id}/evidence/upload",
                headers=auth("coordinator"),
                data={"stage": stage},
                files={"photo": (f"{stage}.png", png("orange" if stage == "before" else "green"), "image/png")},
            )
            response.raise_for_status()
            rows = client.get(
                f"{supabase_url}/rest/v1/report_media",
                headers=service_headers,
                params={
                    "select": "storage_object_path",
                    "report_id": f"eq.{report_id}",
                    "stage": f"eq.{stage}",
                    "order": "created_at.desc",
                    "limit": "1",
                },
            )
            rows.raise_for_status()
            object_path = rows.json()[0]["storage_object_path"]
            created_objects.append(object_path)
            return object_path

        def solve(report_id: str) -> httpx.Response:
            return client.post(
                f"{API_URL}/api/coordinator/reports/{report_id}/status",
                headers=auth("coordinator"),
                json={"status": "Solved"},
            )

        try:
            no_photos = create_active_report("none")
            expect("No photos -> BLOCK", no_photos, solve(no_photos), False)
            direct_rpc = client.post(
                f"{supabase_url}/rest/v1/rpc/fixit_advance_report",
                headers={**service_headers, "Content-Type": "application/json"},
                json={
                    "p_report_id": no_photos,
                    "p_coordinator_id": user_ids["coordinator"],
                    "p_target_status": "Solved",
                    "p_work_details": "database invariant probe",
                },
            )
            expect_database_block("Database RPC without photos -> BLOCK", direct_rpc)
            direct_update = client.patch(
                f"{supabase_url}/rest/v1/problem_reports",
                headers={**service_headers, "Content-Type": "application/json", "Prefer": "return=representation"},
                params={"id": f"eq.{no_photos}"},
                json={"status": "Solved"},
            )
            expect_database_block("Direct database update without photos -> BLOCK", direct_update)

            before_only = create_active_report("before")
            upload(before_only, "before")
            expect("Before only -> BLOCK", before_only, solve(before_only), False)

            after_only = create_active_report("after")
            upload(after_only, "after")
            expect("After only -> BLOCK", after_only, solve(after_only), False)

            both = create_active_report("both")
            upload(both, "before")
            upload(both, "after")
            expect("Both valid photos -> ALLOW", both, solve(both), True)

            target = create_active_report("foreign-target")
            other = create_active_report("foreign-source")
            upload(other, "before")
            upload(other, "after")
            expect("Evidence from another report -> BLOCK", target, solve(target), False)

            missing = create_active_report("missing-objects")
            missing_paths = [upload(missing, "before"), upload(missing, "after")]
            for object_path in missing_paths:
                removed = client.delete(
                    f"{supabase_url}/storage/v1/object/report-media/{object_path}",
                    headers=service_headers,
                )
                removed.raise_for_status()
            expect("Missing storage objects -> BLOCK", missing, solve(missing), False)
        finally:
            # Cleanup is scoped to IDs created by this run and proceeds child-first.
            for report_id in created_reports:
                media = client.get(
                    f"{supabase_url}/rest/v1/report_media",
                    headers=service_headers,
                    params={"select": "storage_object_path", "report_id": f"eq.{report_id}"},
                )
                if media.status_code == 200:
                    for row in media.json():
                        client.delete(
                            f"{supabase_url}/storage/v1/object/report-media/{row['storage_object_path']}",
                            headers=service_headers,
                        )
                for table in (
                    "report_duplicate_candidates",
                    "ai_triage_results",
                    "report_media",
                    "work_records",
                    "report_reporters",
                    "problem_reports",
                ):
                    key = "id" if table == "problem_reports" else "report_id"
                    client.delete(
                        f"{supabase_url}/rest/v1/{table}",
                        headers={**service_headers, "Prefer": "return=minimal"},
                        params={key: f"eq.{report_id}"},
                    )

        solved_rows = client.get(
            f"{supabase_url}/rest/v1/problem_reports",
            headers=service_headers,
            params={"select": "id,created_at,status_changed_at", "status": "eq.Solved"},
        )
        solved_rows.raise_for_status()
        historical_violations: list[str] = []
        for row in solved_rows.json():
            report_id = row["id"]
            media = client.get(
                f"{supabase_url}/rest/v1/report_media",
                headers=service_headers,
                params={
                    "select": "stage,storage_bucket,storage_object_path",
                    "report_id": f"eq.{report_id}",
                    "stage": "in.(before,after)",
                },
            )
            media.raise_for_status()
            valid_stages: set[str] = set()
            referenced_stages: set[str] = set()
            for item in media.json():
                referenced_stages.add(item["stage"])
                if (
                    item["storage_bucket"] == "report-media"
                    and item["storage_object_path"].startswith(f"{report_id}/")
                    and client.head(
                        f"{supabase_url}/storage/v1/object/authenticated/report-media/{item['storage_object_path']}",
                        headers=service_headers,
                    ).status_code
                    == 200
                ):
                    valid_stages.add(item["stage"])
            if not {"before", "after"}.issubset(valid_stages):
                historical_violations.append(report_id)
                print(
                    "AUDIT_VIOLATION "
                    f"report_suffix={report_id[-8:]} created_at={row['created_at']} "
                    f"status_changed_at={row['status_changed_at']} "
                    f"referenced_stages={sorted(referenced_stages)} "
                    f"valid_stages={sorted(valid_stages)}"
                )
        print(
            f"AUDIT existing_solved={len(solved_rows.json())} "
            f"evidence_violations={len(historical_violations)}"
        )
    print(
        f"SUMMARY functional_passed={checks - len(failures)} "
        f"functional_failed={len(failures)} "
        f"historical_audit_violations={len(historical_violations)}"
    )
    return 1 if failures else (2 if historical_violations else 0)


if __name__ == "__main__":
    sys.exit(main())
