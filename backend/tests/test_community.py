import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.community import get_community_service
from app.core.config import Settings
from app.core.security import AppRole, CurrentUser, get_current_user
from app.main import app
from app.models.community import (
    AdminAnalytics, FinancialAnalytics, Notification, ProblemAnalytics, UpcomingWork,
)
from app.services.community import CommunityService, public_work_title


def actor(role: AppRole, suffix: int) -> CurrentUser:
    now = datetime.now(UTC)
    return CurrentUser(
        id=UUID(f"20000000-0000-4000-8000-{suffix:012d}"), role=role,
        created_at=now, updated_at=now, access_token="test-token",
    )


CITIZEN_A = actor(AppRole.CITIZEN, 1)
CITIZEN_B = actor(AppRole.CITIZEN, 2)
ADMIN = actor(AppRole.ADMIN, 3)


class MemoryCommunityService:
    def __init__(self) -> None:
        self.report_statuses = [
            ("Submitted", False), ("Submitted", False), ("Approved", False),
            ("Scheduled", False), ("In Progress", False), ("Solved", False),
            ("Cancelled", True), ("Rejected", False),
        ]
        self.donations = [
            ("Verified", Decimal("100")), ("Verified", Decimal("25.50")),
            ("Pending", Decimal("900")), ("Rejected", Decimal("800")),
        ]
        self.expenses = [
            ("Approved", Decimal("40")), ("Pending", Decimal("700")),
            ("Rejected", Decimal("600")),
        ]
        now = datetime.now(UTC)
        self.upcoming = [
            UpcomingWork(
                tracking_id="FIX-UPCOMING", title="Road", category="Road", status="Scheduled",
                scheduled_for=now + timedelta(days=1),
                work_details="One lane may be temporarily closed.",
            ),
            UpcomingWork(
                tracking_id="FIX-UPCOMING-2", title="Water & Civic Sanitation",
                category="Water & Civic Sanitation", status="Scheduled",
                scheduled_for=now + timedelta(days=2), work_details="Drainage maintenance.",
            ),
        ]
        self.notifications: dict[UUID, list[Notification]] = {
            CITIZEN_A.id: [], CITIZEN_B.id: []
        }

    async def admin_analytics(self, admin, currency):
        return AdminAnalytics(
            problems=ProblemAnalytics(
                total_reports=len(self.report_statuses),
                awaiting_review_submitted=sum(s == "Submitted" for s, _ in self.report_statuses),
                approved=sum(s == "Approved" for s, _ in self.report_statuses),
                scheduled=sum(s == "Scheduled" for s, _ in self.report_statuses),
                in_progress=sum(s == "In Progress" for s, _ in self.report_statuses),
                solved=sum(s == "Solved" for s, _ in self.report_statuses),
                duplicate_merged=sum(merged for _, merged in self.report_statuses),
            ),
            financial=FinancialAnalytics(
                currency=currency,
                total_verified_donations=sum(s == "Verified" for s, _ in self.donations),
                total_verified_donation_amount=sum((a for s, a in self.donations if s == "Verified"), Decimal(0)),
                pending_donation_verification=sum(s == "Pending" for s, _ in self.donations),
                total_approved_spending=sum((a for s, a in self.expenses if s == "Approved"), Decimal(0)),
            ),
        )

    async def upcoming_work(self, now):
        return [item for item in self.upcoming if item.scheduled_for >= now]

    def notify(self, reporters, status):
        now = datetime.now(UTC)
        for citizen_id in reporters:
            self.notifications[citizen_id].append(Notification(
                id=uuid4(), title="Report status updated",
                body=f"Report FIX-MERGED is now {status}.",
                payload={"report_id": str(uuid4()), "tracking_id": "FIX-MERGED", "status": status},
                read_at=None, created_at=now, updated_at=now,
            ))

    async def list_notifications(self, citizen):
        return self.notifications[citizen.id]

    async def mark_notification_read(self, notification_id, citizen, read_at):
        for item in self.notifications[citizen.id]:
            if item.id == notification_id:
                item.read_at = read_at
                item.updated_at = read_at
                return item
        raise HTTPException(status_code=404, detail="Notification not found")


@pytest.fixture
def community_client():
    service = MemoryCommunityService()
    active = {"user": ADMIN}
    app.dependency_overrides[get_current_user] = lambda: active["user"]
    app.dependency_overrides[get_community_service] = lambda: service
    with TestClient(app) as client:
        yield client, service, active
    app.dependency_overrides.clear()


def test_admin_analytics_exactly_match_known_records(community_client):
    client, _, _ = community_client
    response = client.get("/api/admin/analytics?currency=PKR")
    assert response.status_code == 200
    assert response.json() == {
        "problems": {
            "total_reports": 8, "awaiting_review_submitted": 2, "approved": 1,
            "scheduled": 1, "in_progress": 1, "solved": 1, "duplicate_merged": 1,
        },
        "financial": {
            "currency": "PKR", "total_verified_donations": 2,
            "total_verified_donation_amount": "125.50",
            "pending_donation_verification": 1,
            "total_approved_spending": "40",
        },
    }


def test_unverified_finance_is_excluded_and_analytics_is_admin_only(community_client):
    client, _, active = community_client
    body = client.get("/api/admin/analytics?currency=PKR").json()["financial"]
    assert body["total_verified_donation_amount"] == "125.50"
    assert body["total_approved_spending"] == "40"
    active["user"] = CITIZEN_A
    assert client.get("/api/admin/analytics?currency=PKR").status_code == 403


def test_upcoming_work_omits_location_and_private_report_data(community_client):
    client, _, _ = community_client
    response = client.get("/api/upcoming-work")
    assert response.status_code == 200
    assert set(response.json()[0]) == {
        "tracking_id", "title", "category", "status", "scheduled_for", "work_details"
    }
    assert len(response.json()) == 2
    forbidden = {"latitude", "longitude", "created_by", "description", "citizen_id"}
    assert not forbidden.intersection(response.json()[0])


def test_public_work_title_uses_real_category_or_public_work_details():
    assert public_work_title("Damaged Roads & Potholes", "Lane closure") == "Damaged Roads & Potholes"
    assert public_work_title("Upcoming-5b20cb38d7c2", "Temporary lane disruption") == "Temporary lane disruption"
    assert public_work_title("Upcoming-5b20cb38d7c2", None) == "Scheduled Community Work"


def test_upcoming_work_fetches_every_page_and_keeps_safe_query(monkeypatch):
    now = datetime(2026, 10, 10, tzinfo=UTC)
    rows = [
        {
            "report_id": f"00000000-0000-4000-8000-{index:012d}",
            "scheduled_for": (now + timedelta(days=1, minutes=index)).isoformat(),
            "notes": f"Public work details {index}",
            "problem_reports": {
                "tracking_id": f"FIX-{index:012d}",
                "category": "Road Repair",
                "status": "Scheduled",
            },
        }
        for index in range(501)
    ]
    requests: list[dict[str, object]] = []

    class FakeResponse:
        def __init__(self, page):
            self.status_code = 206 if len(page) == 500 else 200
            self._page = page

        def json(self):
            return self._page

    class FakeAsyncClient:
        def __init__(self, **_):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def get(self, _url, headers, params):
            requests.append({"headers": headers, "params": params})
            start = int(headers["Range"].split("-")[0])
            return FakeResponse(rows[start:start + 500])

    monkeypatch.setattr("app.services.community.httpx.AsyncClient", FakeAsyncClient)
    service = CommunityService(Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="publishable",
        supabase_secret_key="secret",
    ))
    result = asyncio.run(service.upcoming_work(now))

    assert len(result) == 501
    assert [request["headers"]["Range"] for request in requests] == ["0-499", "500-999"]
    assert all(request["params"]["problem_reports.status"] == "eq.Scheduled" for request in requests)
    selected = str(requests[0]["params"]["select"])
    assert not {"description", "latitude", "longitude", "created_by"}.intersection(selected.split(","))


@pytest.mark.parametrize("status", ["Approved", "Rejected", "Scheduled", "In Progress", "Solved"])
def test_important_status_changes_create_notifications(community_client, status):
    client, service, active = community_client
    service.notify([CITIZEN_A.id], status)
    active["user"] = CITIZEN_A
    response = client.get("/api/notifications")
    assert response.status_code == 200
    assert response.json()[0]["payload"]["status"] == status


def test_merged_reporters_both_receive_notifications(community_client):
    client, service, active = community_client
    service.notify([CITIZEN_A.id, CITIZEN_B.id], "Solved")
    active["user"] = CITIZEN_A
    assert len(client.get("/api/notifications").json()) == 1
    active["user"] = CITIZEN_B
    assert len(client.get("/api/notifications").json()) == 1


def test_citizen_cannot_read_or_mark_another_notification(community_client):
    client, service, active = community_client
    service.notify([CITIZEN_A.id], "Approved")
    foreign_id = service.notifications[CITIZEN_A.id][0].id
    active["user"] = CITIZEN_B
    assert client.get("/api/notifications").json() == []
    assert client.post(f"/api/notifications/{foreign_id}/read").status_code == 404


def test_citizen_marks_own_notification_read(community_client):
    client, service, active = community_client
    service.notify([CITIZEN_A.id], "Scheduled")
    item_id = service.notifications[CITIZEN_A.id][0].id
    active["user"] = CITIZEN_A
    response = client.post(f"/api/notifications/{item_id}/read")
    assert response.status_code == 200 and response.json()["read_at"] is not None


def test_notification_migration_targets_all_reporters_and_exact_statuses():
    migration = (
        Path(__file__).parents[1] / "supabase" / "migrations"
        / "20261006000000_add_analytics_upcoming_notifications.sql"
    ).read_text(encoding="utf-8")
    assert "from public.report_reporters as rr" in migration
    assert "where rr.report_id = new.id" in migration
    assert "new.status in ('Approved', 'Rejected', 'Scheduled', 'In Progress', 'Solved')" in migration
    assert "latitude" not in migration and "longitude" not in migration
