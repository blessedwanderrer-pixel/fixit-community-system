import hmac

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import get_settings
from app.services.reminders import CoordinatorReminderService, ReminderConfigurationError

router = APIRouter(prefix="/api/internal", tags=["internal"])


@router.get("/scheduled-work-reminders")
async def send_scheduled_work_reminders(
    authorization: str | None = Header(default=None),
) -> dict[str, int]:
    settings = get_settings()
    expected = f"Bearer {settings.cron_secret}" if settings.cron_secret else ""
    if not expected or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    try:
        return await CoordinatorReminderService(settings).send_due_reminders()
    except ReminderConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
