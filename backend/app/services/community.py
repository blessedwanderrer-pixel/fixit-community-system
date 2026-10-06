from datetime import datetime
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.core.security import CurrentUser
from app.models.community import AdminAnalytics, Notification, UpcomingWork


class CommunityService:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_publishable_key:
            raise HTTPException(status_code=503, detail="Supabase is not configured")
        self.base_url = settings.supabase_url.rstrip("/")
        self.publishable_key = settings.supabase_publishable_key
        self.secret_key = settings.supabase_secret_key
        self.timeout = settings.supabase_request_timeout_seconds

    def _service_headers(self) -> dict[str, str]:
        if not self.secret_key:
            raise HTTPException(status_code=503, detail="Supabase backend credentials are not configured")
        headers = {"apikey": self.secret_key, "Content-Type": "application/json"}
        if self.secret_key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.secret_key}"
        return headers

    def _user_headers(self, user: CurrentUser) -> dict[str, str]:
        if not user.access_token:
            raise HTTPException(status_code=401, detail="Bearer token required")
        return {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {user.access_token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _detail(response: httpx.Response) -> str:
        try:
            return str(response.json().get("message") or "SUPABASE_REQUEST_FAILED")
        except (ValueError, AttributeError):
            return "SUPABASE_REQUEST_FAILED"

    async def admin_analytics(
        self, admin: CurrentUser, currency: str
    ) -> AdminAnalytics:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/fixit_admin_analytics",
                    headers=self._service_headers(),
                    json={"p_admin_id": str(admin.id), "p_currency": currency.upper()},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 201}:
            detail = self._detail(response)
            raise HTTPException(status_code=403 if detail == "ADMIN_REQUIRED" else 502, detail=detail)
        return AdminAnalytics.model_validate(response.json())

    async def upcoming_work(self, now: datetime) -> list[UpcomingWork]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/work_records",
                    headers=self._service_headers(),
                    params={
                        "select": "scheduled_for,notes,problem_reports!inner(tracking_id,category,status)",
                        "scheduled_for": f"gte.{now.isoformat()}",
                        "order": "scheduled_for.asc",
                    },
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        result: list[UpcomingWork] = []
        for row in response.json():
            report = row.get("problem_reports") or {}
            if report.get("status") != "Scheduled" or not row.get("scheduled_for"):
                continue
            result.append(
                UpcomingWork(
                    tracking_id=report["tracking_id"], category=report.get("category"),
                    status=report["status"], scheduled_for=row["scheduled_for"],
                    work_details=row.get("notes"),
                )
            )
        return result

    async def list_notifications(self, citizen: CurrentUser) -> list[Notification]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/notifications",
                    headers=self._user_headers(citizen),
                    params={
                        "select": "id,title,body,payload,read_at,created_at,updated_at",
                        "order": "created_at.desc",
                    },
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        return [Notification.model_validate(row) for row in response.json()]

    async def mark_notification_read(
        self, notification_id: UUID, citizen: CurrentUser, read_at: datetime
    ) -> Notification:
        headers = {**self._user_headers(citizen), "Prefer": "return=representation"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/notifications",
                    headers=headers, params={"id": f"eq.{notification_id}"},
                    json={"read_at": read_at.isoformat()},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 204}:
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        rows: Any = response.json() if response.content else []
        if not rows:
            raise HTTPException(status_code=404, detail="Notification not found")
        return Notification.model_validate(rows[0])
