"""Live Stage 5 verification: analytics, upcoming work, notifications, and RLS."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from app.core.config import BACKEND_DIR, get_settings
from app.main import app


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
        print(f"FAIL {name}" + (f" ({detail})" if detail else ""))
        return False


def safe_detail(response: Any) -> str:
    try:
        body = response.json()
    except (ValueError, AttributeError):
        return f"HTTP {response.status_code}"
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("message") or body.get("error_code")
        if detail:
            return f"HTTP {response.status_code}: {detail}"
    return f"HTTP {response.status_code}"


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    results = Results()
    required = {
        "citizen": ("citizen@fixit.test", os.getenv("FIXIT_TEST_CITIZEN_PASSWORD")),
        "citizen2": (os.getenv("FIXIT_TEST_CITIZEN_2_EMAIL"), os.getenv("FIXIT_TEST_CITIZEN_2_PASSWORD")),
        "admin": ("admin@fixit.test", os.getenv("FIXIT_TEST_ADMIN_PASSWORD")),
        "coordinator": ("coordinator@fixit.test", os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD")),
    }
    if not all(email and password for email, password in required.values()):
        print("FAIL configuration: required test credential variable missing")
        return 1
    if not all((settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key)):
        print("FAIL configuration: Supabase configuration missing")
        return 1

    base_url = settings.supabase_url.rstrip("/")
    service_headers = {"apikey": settings.supabase_secret_key, "Content-Type": "application/json"}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"
    tokens: dict[str, str] = {}
    users: dict[str, str] = {}
    api = TestClient(app)
    run_id = uuid4().hex[:12]
    future_time = datetime.now(UTC) + timedelta(days=5)
    past_time = datetime.now(UTC) - timedelta(days=5)

    with httpx.Client(timeout=settings.supabase_request_timeout_seconds) as live:
        for role, (email, password) in required.items():
            response = live.post(
                f"{base_url}/auth/v1/token",
                headers={"apikey": settings.supabase_publishable_key},
                params={"grant_type": "password"},
                json={"email": email, "password": password},
            )
            ok = response.status_code == 200 and bool(response.json().get("access_token"))
            results.check(f"authenticate {role}", ok, safe_detail(response))
            if not ok:
                return 1
            tokens[role] = response.json()["access_token"]
            me = api.get("/api/me", headers={"Authorization": f"Bearer {tokens[role]}"})
            expected = "citizen" if role == "citizen2" else role
            ok = me.status_code == 200 and me.json().get("role") == expected
            results.check(f"load {role} profile", ok, safe_detail(me))
            if not ok:
                return 1
            users[role] = me.json()["id"]

        def auth(role: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {tokens[role]}"}

        def user_headers(role: str) -> dict[str, str]:
            return {
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {tokens[role]}",
                "Content-Type": "application/json",
            }

        def rpc(name: str, payload: dict[str, Any]) -> dict[str, Any]:
            response = live.post(
                f"{base_url}/rest/v1/rpc/{name}", headers=service_headers, json=payload
            )
            if response.status_code not in {200, 201} or not isinstance(response.json(), dict):
                raise RuntimeError(f"{name} failed safely: {safe_detail(response)}")
            return response.json()

        def create_report(citizen_role: str, category: str, latitude_offset: float = 0) -> dict[str, Any]:
            return rpc("fixit_create_report", {
                "p_citizen_id": users[citizen_role],
                "p_description": f"Private Stage 5 test description {run_id}",
                "p_category": category,
                "p_latitude": 31.50 + latitude_offset,
                "p_longitude": 74.30,
                "p_photo_reference": f"stage5/{run_id}/{uuid4().hex}.jpg",
            })

        def decide(report_id: str, decision: str) -> Any:
            response = api.post(
                f"/api/admin/reports/{report_id}/decision",
                headers=auth("admin"), json={"status": decision},
            )
            if response.status_code != 200:
                raise RuntimeError(f"admin decision failed safely: {safe_detail(response)}")
            return response

        def schedule(report_id: str, when: datetime, details: str) -> Any:
            response = api.post(
                f"/api/coordinator/reports/{report_id}/schedule",
                headers=auth("coordinator"),
                json={"scheduled_for": when.isoformat(), "work_details": details},
            )
            if response.status_code != 200:
                raise RuntimeError(f"schedule failed safely: {safe_detail(response)}")
            return response

        def fetch_all(table: str, select: str, extra: dict[str, str] | None = None) -> list[dict[str, Any]]:
            rows: list[dict[str, Any]] = []
            start = 0
            page_size = 500
            while True:
                response = live.get(
                    f"{base_url}/rest/v1/{table}",
                    headers={**service_headers, "Range": f"{start}-{start + page_size - 1}"},
                    params={"select": select, **(extra or {})},
                )
                if response.status_code not in {200, 206} or not isinstance(response.json(), list):
                    raise RuntimeError(f"database aggregate read failed safely: {safe_detail(response)}")
                page = response.json()
                rows.extend(page)
                if len(page) < page_size:
                    return rows
                start += page_size

        # UPCOMING: one included future Scheduled row, one past Scheduled row,
        # and one future work record whose report advances to In Progress.
        upcoming_category = f"Upcoming-{run_id}"
        future_report = create_report("citizen", upcoming_category)
        decide(future_report["id"], "Approved")
        schedule(future_report["id"], future_time, "Temporary lane disruption")

        past_report = create_report("citizen", f"Past-{run_id}", 0.01)
        decide(past_report["id"], "Approved")
        schedule(past_report["id"], past_time, "Past scheduled work")

        progress_report = create_report("citizen", f"Progress-{run_id}", 0.02)
        decide(progress_report["id"], "Approved")
        schedule(progress_report["id"], future_time + timedelta(hours=1), "Already started")
        progress = api.post(
            f"/api/coordinator/reports/{progress_report['id']}/status",
            headers=auth("coordinator"), json={"status": "In Progress"},
        )
        results.check("real report advances to In Progress", progress.status_code == 200, safe_detail(progress))

        upcoming_response = api.get("/api/upcoming-work")
        upcoming_rows = upcoming_response.json() if upcoming_response.status_code == 200 else []
        future_matches = [row for row in upcoming_rows if row.get("tracking_id") == future_report["tracking_id"]]
        results.check(
            "future Scheduled work appears in public upcoming work",
            len(future_matches) == 1 and future_matches[0].get("category") == upcoming_category
            and future_matches[0].get("work_details") == "Temporary lane disruption",
            safe_detail(upcoming_response),
        )
        returned_ids = {row.get("tracking_id") for row in upcoming_rows}
        results.check(
            "past and non-Scheduled work are excluded",
            past_report["tracking_id"] not in returned_ids
            and progress_report["tracking_id"] not in returned_ids,
        )
        forbidden = {
            "latitude", "longitude", "created_by", "citizen_id", "recipient_id",
            "reporters", "description", "location", "address", "area", "district",
        }
        results.check(
            "upcoming work exposes no private or derived location data",
            all(not forbidden.intersection(row) for row in upcoming_rows),
        )

        # NOTIFICATIONS: use the progress report's real three transitions.
        notification_rows = fetch_all(
            "notifications", "id,recipient_id,payload,read_at",
            {"payload->>report_id": f"eq.{progress_report['id']}"},
        )
        notification_statuses = {
            row.get("payload", {}).get("status") for row in notification_rows
            if row.get("recipient_id") == users["citizen"]
        }
        results.check(
            "Approved Scheduled and In Progress triggers persisted notifications",
            notification_statuses == {"Approved", "Scheduled", "In Progress"},
        )
        citizen_notifications = api.get("/api/notifications", headers=auth("citizen"))
        citizen_body = citizen_notifications.json() if citizen_notifications.status_code == 200 else []
        own_for_report = [
            row for row in citizen_body
            if row.get("payload", {}).get("report_id") == progress_report["id"]
        ]
        results.check(
            "Citizen lists own real status notifications",
            citizen_notifications.status_code == 200 and len(own_for_report) == 3,
            safe_detail(citizen_notifications),
        )
        own_notification_id = own_for_report[0]["id"]
        mark_read = api.post(
            f"/api/notifications/{own_notification_id}/read", headers=auth("citizen")
        )
        persisted_read = fetch_all(
            "notifications", "read_at", {"id": f"eq.{own_notification_id}"}
        )
        results.check(
            "Citizen marks own notification read and read_at persists",
            mark_read.status_code == 200 and bool(mark_read.json().get("read_at"))
            and len(persisted_read) == 1 and bool(persisted_read[0].get("read_at")),
            safe_detail(mark_read),
        )

        # Create a Citizen-2 notification, then test Citizen-1 isolation.
        citizen2_report = create_report("citizen2", f"Private-C2-{run_id}", 0.03)
        decide(citizen2_report["id"], "Approved")
        citizen2_db_notifications = fetch_all(
            "notifications", "id,recipient_id,payload,read_at",
            {"payload->>report_id": f"eq.{citizen2_report['id']}"},
        )
        foreign_notification = citizen2_db_notifications[0]
        citizen1_direct_read = live.get(
            f"{base_url}/rest/v1/notifications", headers=user_headers("citizen"),
            params={"select": "id", "id": f"eq.{foreign_notification['id']}"},
        )
        citizen1_update = api.post(
            f"/api/notifications/{foreign_notification['id']}/read", headers=auth("citizen")
        )
        foreign_after = fetch_all(
            "notifications", "read_at", {"id": f"eq.{foreign_notification['id']}"}
        )
        results.check(
            "Citizen cannot read another Citizen notification through RLS",
            citizen1_direct_read.status_code == 200 and citizen1_direct_read.json() == [],
            safe_detail(citizen1_direct_read),
        )
        results.check(
            "Citizen cannot mark another Citizen notification read",
            citizen1_update.status_code == 404 and foreign_after[0].get("read_at") is None,
            safe_detail(citizen1_update),
        )
        coordinator_notifications = api.get("/api/notifications", headers=auth("coordinator"))
        results.check(
            "Coordinator cannot access Citizen notifications endpoint",
            coordinator_notifications.status_code == 403,
            safe_detail(coordinator_notifications),
        )

        # MERGED REPORTER: Citizen-2 source is merged into Citizen-1 target,
        # then target approval must notify both preserved reporters.
        merge_category = f"Merge-Notify-{run_id}"
        target = create_report("citizen", merge_category, 0.04)
        source = create_report("citizen2", merge_category, 0.0405)
        merge = api.post(
            f"/api/admin/reports/{source['id']}/merge", headers=auth("admin"),
            json={"target_report_id": target["id"]},
        )
        results.check(
            "Admin merge preserves two real Citizen reporters",
            merge.status_code == 200 and merge.json().get("reporters_preserved") == 2,
            safe_detail(merge),
        )
        decide(target["id"], "Approved")
        merged_notifications = fetch_all(
            "notifications", "recipient_id,payload",
            {"payload->>report_id": f"eq.{target['id']}", "payload->>status": "eq.Approved"},
        )
        recipients = {row.get("recipient_id") for row in merged_notifications}
        results.check(
            "preserved merged reporter receives later target notification",
            users["citizen"] in recipients and users["citizen2"] in recipients
            and len(recipients) == 2,
        )
        citizen2_list = api.get("/api/notifications", headers=auth("citizen2"))
        citizen2_sees_merge = any(
            row.get("payload", {}).get("report_id") == target["id"]
            and row.get("payload", {}).get("status") == "Approved"
            for row in (citizen2_list.json() if citizen2_list.status_code == 200 else [])
        )
        results.check(
            "merged Citizen retrieves preserved-reporter notification with own JWT",
            citizen2_list.status_code == 200 and citizen2_sees_merge,
            safe_detail(citizen2_list),
        )

        # ANALYTICS: direct complete database aggregates versus Admin endpoint.
        reports = fetch_all("problem_reports", "status,merged_into_report_id")
        donations = fetch_all("donations", "status,amount,currency", {"currency": "eq.PKR"})
        expenses = fetch_all("expenses", "status,amount,currency", {"currency": "eq.PKR"})
        expected = {
            "problems": {
                "total_reports": len(reports),
                "awaiting_review_submitted": sum(r["status"] == "Submitted" for r in reports),
                "approved": sum(r["status"] == "Approved" for r in reports),
                "scheduled": sum(r["status"] == "Scheduled" for r in reports),
                "in_progress": sum(r["status"] == "In Progress" for r in reports),
                "solved": sum(r["status"] == "Solved" for r in reports),
                "duplicate_merged": sum(r.get("merged_into_report_id") is not None for r in reports),
            },
            "financial": {
                "currency": "PKR",
                "total_verified_donations": sum(d["status"] == "Verified" for d in donations),
                "total_verified_donation_amount": sum(
                    (Decimal(str(d["amount"])) for d in donations if d["status"] == "Verified"), Decimal(0)
                ),
                "pending_donation_verification": sum(d["status"] == "Pending" for d in donations),
                "total_approved_spending": sum(
                    (Decimal(str(e["amount"])) for e in expenses if e["status"] == "Approved"), Decimal(0)
                ),
            },
        }
        analytics = api.get("/api/admin/analytics?currency=PKR", headers=auth("admin"))
        actual = analytics.json() if analytics.status_code == 200 else {}
        actual_normalized = actual.copy()
        if actual:
            actual_normalized["financial"] = {
                **actual["financial"],
                "total_verified_donation_amount": Decimal(actual["financial"]["total_verified_donation_amount"]),
                "total_approved_spending": Decimal(actual["financial"]["total_approved_spending"]),
            }
        results.check(
            "Admin analytics every metric matches direct real database aggregates",
            analytics.status_code == 200 and actual_normalized == expected,
            safe_detail(analytics),
        )
        results.check(
            "only Verified donations contribute and Pending count is exact",
            actual_normalized.get("financial", {}).get("total_verified_donation_amount")
            == expected["financial"]["total_verified_donation_amount"]
            and actual_normalized.get("financial", {}).get("pending_donation_verification")
            == expected["financial"]["pending_donation_verification"],
        )
        results.check(
            "only Approved expenses contribute to spending",
            actual_normalized.get("financial", {}).get("total_approved_spending")
            == expected["financial"]["total_approved_spending"],
        )
        for role in ("citizen", "coordinator"):
            denied = api.get("/api/admin/analytics?currency=PKR", headers=auth(role))
            results.check(f"{role.capitalize()} cannot access Admin analytics", denied.status_code == 403, safe_detail(denied))

        print("ANALYTICS_EXPECTED_PROBLEMS " + repr(expected["problems"]))
        print("ANALYTICS_ACTUAL_PROBLEMS " + repr(actual.get("problems", {})))
        print("ANALYTICS_EXPECTED_FINANCIAL " + repr(expected["financial"]))
        print("ANALYTICS_ACTUAL_FINANCIAL " + repr(actual.get("financial", {})))
        print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
        return 1 if results.failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"FAIL live Stage 5 verification aborted safely: {exc}")
        sys.exit(1)
