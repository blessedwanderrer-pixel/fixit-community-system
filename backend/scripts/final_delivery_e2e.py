"""Production-safe final workflow audit using isolated test accounts and cleanup."""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from PIL import Image

from app.core.config import BACKEND_DIR, get_settings

API_URL = "https://fixit-community-api.vercel.app"


def image_bytes(color: str) -> bytes:
    stream = BytesIO()
    Image.new("RGB", (64, 64), color).save(stream, "PNG")
    return stream.getvalue()


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    accounts = {
        "citizen": ("citizen@fixit.test", os.getenv("FIXIT_TEST_CITIZEN_PASSWORD")),
        "citizen2": (os.getenv("FIXIT_TEST_CITIZEN_2_EMAIL"), os.getenv("FIXIT_TEST_CITIZEN_2_PASSWORD")),
        "admin": ("admin@fixit.test", os.getenv("FIXIT_TEST_ADMIN_PASSWORD")),
        "coordinator": ("coordinator@fixit.test", os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD")),
    }
    if not all(email and password for email, password in accounts.values()):
        print("BLOCKED missing isolated test-account credentials")
        return 2
    if not all((settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key)):
        print("BLOCKED missing Supabase audit configuration")
        return 2

    run_id = uuid4().hex[:12]
    category = f"Final-Audit-{run_id}"
    report_ids: list[str] = []
    failures: list[str] = []
    checks = 0
    supabase_url = settings.supabase_url.rstrip("/")
    service_headers = {"apikey": settings.supabase_secret_key}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"

    def check(label: str, passed: bool, detail: str = "") -> None:
        nonlocal checks
        checks += 1
        print(f"{'PASS' if passed else 'FAIL'} {label}" + (f" ({detail})" if detail and not passed else ""))
        if not passed:
            failures.append(label)

    with httpx.Client(timeout=90) as client:
        tokens: dict[str, str] = {}
        users: dict[str, str] = {}
        for role, (email, password) in accounts.items():
            response = client.post(
                f"{supabase_url}/auth/v1/token",
                headers={"apikey": settings.supabase_publishable_key},
                params={"grant_type": "password"},
                json={"email": email, "password": password},
            )
            check(f"authenticate {role}", response.status_code == 200)
            if response.status_code != 200:
                return 1
            tokens[role] = response.json()["access_token"]
            me = client.get(f"{API_URL}/api/me", headers={"Authorization": f"Bearer {tokens[role]}"})
            expected = "citizen" if role == "citizen2" else role
            check(f"backend role for {role}", me.status_code == 200 and me.json().get("role") == expected)
            users[role] = me.json()["id"]

        def auth(role: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {tokens[role]}"}

        def rows(table: str, select: str, params: dict[str, str]) -> list[dict]:
            response = client.get(
                f"{supabase_url}/rest/v1/{table}",
                headers=service_headers,
                params={"select": select, **params},
            )
            response.raise_for_status()
            return response.json()

        try:
            invalid = client.get(f"{API_URL}/api/me", headers={"Authorization": "Bearer invalid-token"})
            check("invalid token rejected", invalid.status_code == 401)
            forbidden = client.get(f"{API_URL}/api/admin/reports/submitted", headers=auth("citizen"))
            check("citizen blocked from Admin API", forbidden.status_code == 403)

            def create(role: str, description: str, latitude: str) -> dict:
                response = client.post(
                    f"{API_URL}/api/reports/with-photo",
                    headers=auth(role),
                    data={
                        "description": description,
                        "category": category,
                        "latitude": latitude,
                        "longitude": "74.3587",
                    },
                    files={"photo": ("report.png", image_bytes("navy"), "image/png")},
                )
                check(f"{role} submits report", response.status_code == 201, response.text[:160])
                result = response.json()
                report_ids.append(result["id"])
                check("tracking ID returned", bool(result.get("tracking_id")))
                return result

            target = create("citizen", "Public pipeline is leaking into the street.", "31.5204")
            foreign_read = client.get(f"{API_URL}/api/reports/{target['id']}", headers=auth("citizen2"))
            check("cross-citizen report read blocked", foreign_read.status_code == 404)

            duplicate = create("citizen2", "Same public pipeline leak reported nearby.", "31.52045")
            check(
                "nearby same-category duplicate flagged",
                duplicate.get("possible_duplicate") is True and duplicate.get("duplicate_candidate_count", 0) >= 1,
            )
            review = client.get(f"{API_URL}/api/admin/reports/{duplicate['id']}/review", headers=auth("admin"))
            review_body = review.json() if review.status_code == 200 else {}
            check("Admin sees duplicate candidate distance", review.status_code == 200 and bool(review_body.get("duplicate_candidates")))
            merge = client.post(
                f"{API_URL}/api/admin/reports/{duplicate['id']}/merge",
                headers=auth("admin"),
                json={"target_report_id": target["id"]},
            )
            check("Admin merges duplicate and preserves reporters", merge.status_code == 200 and merge.json().get("reporters_preserved") == 2)

            triage = rows("ai_triage_results", "result", {"report_id": f"eq.{target['id']}", "limit": "1"})
            required_ai = {"short_summary", "suggested_category", "priority", "community_private_scope", "recommendation", "reason"}
            check("live AI triage persisted required schema", bool(triage) and required_ai == set(triage[0]["result"]))

            approval = client.post(
                f"{API_URL}/api/admin/reports/{target['id']}/decision",
                headers=auth("admin"), json={"status": "Approved"},
            )
            check("Admin approves report", approval.status_code == 200 and approval.json().get("status") == "Approved")
            coordinator_approval = client.post(
                f"{API_URL}/api/admin/reports/{target['id']}/decision",
                headers=auth("coordinator"), json={"status": "Rejected"},
            )
            check("Coordinator cannot decide report", coordinator_approval.status_code == 403)

            schedule = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/schedule",
                headers=auth("coordinator"),
                json={"scheduled_for": (datetime.now(UTC) + timedelta(days=1)).isoformat(), "work_details": "Inspect and repair pipeline."},
            )
            check("Coordinator schedules approved work", schedule.status_code == 200 and schedule.json().get("status") == "Scheduled")
            started = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/status",
                headers=auth("coordinator"), json={"status": "In Progress", "work_details": "Pipeline repair started."},
            )
            check("Coordinator starts work", started.status_code == 200 and started.json().get("status") == "In Progress")

            no_photos = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/submit-verification",
                headers=auth("coordinator"), json={"work_details": "Repair completed."},
            )
            check("verification blocked with no photos", no_photos.status_code == 409)

            def upload(stage: str, color: str) -> httpx.Response:
                return client.post(
                    f"{API_URL}/api/coordinator/reports/{target['id']}/evidence/upload",
                    headers=auth("coordinator"), data={"stage": stage},
                    files={"photo": (f"{stage}.png", image_bytes(color), "image/png")},
                )

            before = upload("before", "orange")
            check("before evidence uploaded", before.status_code == 200)
            before_only = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/submit-verification",
                headers=auth("coordinator"), json={"work_details": "Repair completed."},
            )
            check("verification blocked with before only", before_only.status_code == 409)
            after = upload("after", "green")
            check("after evidence uploaded", after.status_code == 200)
            submitted = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/submit-verification",
                headers=auth("coordinator"), json={"work_details": "Damaged pipeline was repaired and the area was restored."},
            )
            check("completed work enters Admin verification", submitted.status_code == 200)

            hidden = client.get(f"{API_URL}/api/completed-work/{target['id']}/evidence/before")
            check("unapproved evidence not public", hidden.status_code == 404)
            pending = client.get(f"{API_URL}/api/admin/work-verifications", headers=auth("admin"))
            item = next((row for row in pending.json() if row.get("report_id") == target["id"]), None) if pending.status_code == 200 else None
            check("Admin receives AI-analyzed pending work", bool(item) and bool(item.get("image_analysis")) and 5 <= len(item.get("public_summary", "").splitlines()) <= 7)

            blank_objection = client.post(
                f"{API_URL}/api/admin/work-verifications/{target['id']}",
                headers=auth("admin"), json={"decision": "Objected", "reason": "   "},
            )
            check("blank objection rejected", blank_objection.status_code == 422)
            objection = client.post(
                f"{API_URL}/api/admin/work-verifications/{target['id']}",
                headers=auth("admin"), json={"decision": "Objected", "reason": "Please provide clearer after evidence."},
            )
            check("valid Admin objection saved", objection.status_code == 200)
            queue = client.get(f"{API_URL}/api/coordinator/reports", headers=auth("coordinator"))
            objected = next((row for row in queue.json() if row.get("id") == target["id"]), None) if queue.status_code == 200 else None
            check("Coordinator sees objection reason", bool(objected) and objected.get("verification_status") == "Objected" and objected.get("verification_reason") == "Please provide clearer after evidence.")

            corrected = upload("after", "white")
            check("Coordinator uploads corrected evidence", corrected.status_code == 200)
            resubmit = client.post(
                f"{API_URL}/api/coordinator/reports/{target['id']}/submit-verification",
                headers=auth("coordinator"), json={"work_details": "Pipeline repaired; corrected completion evidence supplied."},
            )
            check("Coordinator resubmits objected work", resubmit.status_code == 200)
            final_approval = client.post(
                f"{API_URL}/api/admin/work-verifications/{target['id']}",
                headers=auth("admin"), json={"decision": "Approved", "reason": None},
            )
            check("Admin approval records solved work", final_approval.status_code == 200)
            repeated = client.post(
                f"{API_URL}/api/admin/work-verifications/{target['id']}",
                headers=auth("admin"), json={"decision": "Approved", "reason": None},
            )
            check("repeated approval rejected", repeated.status_code == 409)
            transparency = client.get(f"{API_URL}/api/transparency?currency=PKR")
            completed = transparency.json().get("completed_work", []) if transparency.status_code == 200 else []
            check("approved work appears publicly", any(row.get("report_id") == target["id"] for row in completed))
            public_before = client.get(f"{API_URL}/api/completed-work/{target['id']}/evidence/before")
            public_after = client.get(f"{API_URL}/api/completed-work/{target['id']}/evidence/after")
            check("approved before and after evidence are public", public_before.status_code == 200 and public_after.status_code == 200)
            private_admin_media = client.get(
                f"{API_URL}/api/admin/work-verifications/{target['id']}/evidence/after",
                headers=auth("citizen"),
            )
            check("Citizen blocked from private Admin evidence route", private_admin_media.status_code == 403)
        finally:
            for report_id in report_ids:
                media_rows = rows("report_media", "storage_bucket,storage_object_path", {"report_id": f"eq.{report_id}"})
                for media in media_rows:
                    client.delete(
                        f"{supabase_url}/storage/v1/object/{media['storage_bucket']}/{media['storage_object_path']}",
                        headers=service_headers,
                    )
                client.delete(
                    f"{supabase_url}/rest/v1/notifications", headers=service_headers,
                    params={"payload->>report_id": f"eq.{report_id}"},
                )
                client.delete(
                    f"{supabase_url}/rest/v1/report_duplicate_candidates", headers=service_headers,
                    params={"or": f"(report_id.eq.{report_id},candidate_report_id.eq.{report_id})"},
                )
                for table in ("ai_triage_results", "report_media", "expenses", "work_records", "report_reporters"):
                    client.delete(f"{supabase_url}/rest/v1/{table}", headers=service_headers, params={"report_id": f"eq.{report_id}"})
            # Delete merged reports after all child rows are gone. The source report
            # can reference the target, so remove reports in reverse creation order.
            for report_id in reversed(report_ids):
                client.delete(f"{supabase_url}/rest/v1/problem_reports", headers=service_headers, params={"id": f"eq.{report_id}"})
            remaining = rows("problem_reports", "id", {"category": f"eq.{category}"})
            check("temporary audit records cleaned up", remaining == [])

    print(f"SUMMARY passed={checks - len(failures)} failed={len(failures)} total={checks}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
