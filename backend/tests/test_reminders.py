from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.services.reminders import CoordinatorReminderService


def test_cron_route_rejects_missing_or_wrong_secret(monkeypatch) -> None:
    monkeypatch.setenv("CRON_SECRET", "test-cron-secret")
    get_settings.cache_clear()
    try:
        with TestClient(app) as client:
            assert client.get("/api/internal/scheduled-work-reminders").status_code == 401
            assert client.get(
                "/api/internal/scheduled-work-reminders",
                headers={"Authorization": "Bearer wrong-secret"},
            ).status_code == 401
    finally:
        get_settings.cache_clear()


def test_cron_route_runs_authorized_reminder_service(monkeypatch) -> None:
    monkeypatch.setenv("CRON_SECRET", "test-cron-secret")
    get_settings.cache_clear()

    async def fake_send(self) -> dict[str, int]:
        return {"claimed": 1, "sent": 1, "failed": 0}

    monkeypatch.setattr(CoordinatorReminderService, "send_due_reminders", fake_send)
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/internal/scheduled-work-reminders",
                headers={"Authorization": "Bearer test-cron-secret"},
            )
        assert response.status_code == 200
        assert response.json() == {"claimed": 1, "sent": 1, "failed": 0}
    finally:
        get_settings.cache_clear()


def test_email_contains_schedule_and_assignment_details() -> None:
    settings = get_settings().model_copy(
        update={
            "supabase_url": "https://example.supabase.co",
            "supabase_secret_key": "secret",
            "google_app_password": "app-password",
        }
    )
    service = CoordinatorReminderService(settings)
    message = service._build_message(
        {
            "scheduled_for": datetime(2026, 10, 23, 9, 0, tzinfo=timezone.utc).isoformat(),
            "tracking_id": "FIX-123456",
            "category": "Pipeline Leakage",
            "work_details": "Bring repair clamps and inspect the main line.",
            "coordinator_email": "coordinator@example.test",
        }
    )
    body = message.get_content()
    assert "FIX-123456" in body
    assert "Pipeline Leakage" in body
    assert "02:00 PM" in body
    assert "Pakistan time" in body
    assert "Bring repair clamps" in body
    assert message["To"] == "coordinator@example.test"


def test_reminder_migration_is_claim_once_and_service_role_only() -> None:
    migration = (
        Path(__file__).parents[1]
        / "supabase"
        / "migrations"
        / "20261023000000_add_coordinator_email_reminders.sql"
    ).read_text(encoding="utf-8")
    normalized = migration.lower()
    assert "for update of wr skip locked" in normalized
    assert "reminder_sent_at is null" in normalized
    assert "grant execute on function public.fixit_claim_due_work_reminders(integer)" in normalized
    assert "to service_role" in normalized
    assert "from public, anon, authenticated" in normalized
