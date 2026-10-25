import asyncio
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any

import httpx

from app.core.config import Settings


class ReminderConfigurationError(RuntimeError):
    pass


class CoordinatorReminderService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        if not settings.supabase_url or not settings.supabase_secret_key:
            raise ReminderConfigurationError("Supabase backend credentials are not configured")
        if not settings.google_app_password:
            raise ReminderConfigurationError("Google app password is not configured")

    @property
    def _headers(self) -> dict[str, str]:
        headers = {
            "apikey": self.settings.supabase_secret_key or "",
            "Content-Type": "application/json",
        }
        if (self.settings.supabase_secret_key or "").startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.settings.supabase_secret_key}"
        return headers

    async def _rpc(self, function: str, payload: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=self.settings.supabase_request_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function}",
                headers=self._headers,
                json=payload,
            )
        response.raise_for_status()
        return response.json()

    def _build_message(self, reminder: dict[str, Any]) -> EmailMessage:
        scheduled = datetime.fromisoformat(reminder["scheduled_for"].replace("Z", "+00:00"))
        pakistan_time = timezone(timedelta(hours=5), name="PKT")
        local_time = scheduled.astimezone(pakistan_time)
        tracking_id = reminder["tracking_id"]
        category = reminder.get("category") or "Community problem"
        work_details = (reminder.get("work_details") or "No additional work notes were provided.").strip()
        dashboard_url = f"{self.settings.public_frontend_url.rstrip('/')}/coordinator"

        message = EmailMessage()
        message["Subject"] = f"FixIt reminder: {tracking_id} is scheduled in about 3 hours"
        message["From"] = self.settings.smtp_from_email
        message["To"] = reminder["coordinator_email"]
        message.set_content(
            "\n".join(
                [
                    "FixIt scheduled-work reminder",
                    "",
                    f"Tracking ID: {tracking_id}",
                    f"Category: {category}",
                    f"Scheduled time: {local_time:%A, %d %B %Y at %I:%M %p} (Pakistan time)",
                    f"Work details: {work_details}",
                    "",
                    "Please open your Coordinator dashboard to review the assignment and prepare the required before-work evidence.",
                    dashboard_url,
                    "",
                    "This is an automatic reminder sent approximately three hours before scheduled work.",
                ]
            )
        )
        return message

    def _send_sync(self, message: EmailMessage) -> None:
        password = self.settings.google_app_password or ""
        if self.settings.smtp_port == 465:
            with smtplib.SMTP_SSL(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as smtp:
                smtp.login(self.settings.smtp_username, password)
                smtp.send_message(message)
            return

        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(self.settings.smtp_username, password)
            smtp.send_message(message)

    async def send_due_reminders(self) -> dict[str, int]:
        reminders = await self._rpc("fixit_claim_due_work_reminders", {"p_limit": 25})
        sent = 0
        failed = 0

        for reminder in reminders:
            try:
                await asyncio.to_thread(self._send_sync, self._build_message(reminder))
            except Exception as exc:
                failed += 1
                await self._rpc(
                    "fixit_finish_work_reminder",
                    {
                        "p_work_record_id": reminder["work_record_id"],
                        "p_succeeded": False,
                        "p_error": str(exc)[:500],
                    },
                )
            else:
                sent += 1
                await self._rpc(
                    "fixit_finish_work_reminder",
                    {
                        "p_work_record_id": reminder["work_record_id"],
                        "p_succeeded": True,
                        "p_error": None,
                    },
                )

        return {"claimed": len(reminders), "sent": sent, "failed": failed}
