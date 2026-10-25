from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, UploadFile

from app.core.config import Settings
from app.core.security import CurrentUser
from app.models.finance import (
    Donation,
    DonationStatus,
    Expense,
    ExpenseStatus,
    PublicWork,
    TransparencySummary,
)
from app.services.storage import StorageService


class FinanceService:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_secret_key:
            raise HTTPException(status_code=503, detail="Supabase backend is not configured")
        self.base_url = settings.supabase_url.rstrip("/")
        self.key = settings.supabase_secret_key
        self.timeout = settings.supabase_request_timeout_seconds
        self.storage = StorageService(settings)

    def _headers(self, *, prefer: str | None = None) -> dict[str, str]:
        headers = {"apikey": self.key, "Content-Type": "application/json"}
        if self.key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.key}"
        if prefer:
            headers["Prefer"] = prefer
        return headers

    @staticmethod
    def _safe_message(response: httpx.Response) -> str:
        try:
            payload = response.json()
            return str(payload.get("message") or payload.get("code") or "REQUEST_FAILED")
        except (ValueError, AttributeError):
            return "REQUEST_FAILED"

    async def _post(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/{table}",
                    headers=self._headers(prefer="return=representation"), json=payload,
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 201}:
            message = self._safe_message(response)
            if response.status_code == 409 or "duplicate" in message.lower():
                raise HTTPException(status_code=409, detail="Duplicate transaction_id")
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        rows = response.json()
        if not isinstance(rows, list) or not rows:
            raise HTTPException(status_code=502, detail="Invalid Supabase database response")
        return rows[0]

    async def _rpc(self, name: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/{name}", headers=self._headers(), json=payload
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 201}:
            message = self._safe_message(response)
            mapping = {
                "ADMIN_REQUIRED": 403, "DONATION_NOT_PENDING": 409,
                "EXPENSE_NOT_PENDING": 409, "INVALID_DONATION_DECISION": 422,
                "INVALID_EXPENSE_DECISION": 422,
            }
            raise HTTPException(status_code=mapping.get(message, 502), detail=message)
        result = response.json()
        if not isinstance(result, dict):
            raise HTTPException(status_code=502, detail="Invalid Supabase database response")
        return result

    async def submit_donation(
        self, user: CurrentUser, transaction_id: str, amount: Decimal,
        currency: str, transaction_at: datetime, screenshot: UploadFile,
    ) -> Donation:
        path, _ = await self.storage.store_private_image("donation-proofs", user, screenshot)
        try:
            row = await self._post("donations", {
                "donor_id": str(user.id), "transaction_id": transaction_id.strip(),
                "amount": str(amount), "currency": currency.upper(),
                "transaction_at": transaction_at.isoformat(), "status": "Pending",
                "screenshot_storage_bucket": "donation-proofs",
                "screenshot_storage_object_path": path,
            })
        except Exception:
            await self.storage.remove("donation-proofs", path)
            raise
        return Donation.model_validate(row)

    async def review_donation(
        self, donation_id: UUID, admin: CurrentUser, decision: DonationStatus
    ) -> Donation:
        return Donation.model_validate(await self._rpc("fixit_review_donation", {
            "p_donation_id": str(donation_id), "p_admin_id": str(admin.id),
            "p_status": decision.value,
        }))

    async def pending_donations(self) -> list[Donation]:
        return [Donation.model_validate(row) for row in await self._list_pending("donations")]

    async def _private_media_for_row(
        self, table: str, row_id: UUID, bucket_column: str, path_column: str
    ) -> tuple[bytes, str]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/{table}", headers=self._headers(),
                    params={"select": f"{bucket_column},{path_column}", "id": f"eq.{row_id}", "limit": "1"},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        rows = response.json() if response.status_code == 200 else []
        if not rows:
            raise HTTPException(status_code=404, detail="Record not found")
        return await self.storage.download(rows[0][bucket_column], rows[0][path_column])

    async def donation_proof(self, donation_id: UUID) -> tuple[bytes, str]:
        return await self._private_media_for_row(
            "donations", donation_id, "screenshot_storage_bucket", "screenshot_storage_object_path"
        )

    async def submit_expense(
        self, user: CurrentUser, report_id: UUID, amount: Decimal,
        currency: str, description: str, receipt: UploadFile,
    ) -> Expense:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                assignment = await client.get(
                    f"{self.base_url}/rest/v1/work_records", headers=self._headers(),
                    params={"select": "id", "report_id": f"eq.{report_id}",
                            "coordinator_id": f"eq.{user.id}", "limit": "1"},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if assignment.status_code != 200:
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        if not assignment.json():
            raise HTTPException(status_code=403, detail="Coordinator is not assigned to this work")
        path, _ = await self.storage.store_private_image(
            "expense-receipts", user, receipt, parent_id=report_id
        )
        try:
            row = await self._post("expenses", {
                "report_id": str(report_id), "submitted_by": str(user.id),
                "amount": str(amount), "currency": currency.upper(),
                "description": description.strip(),
                "receipt_storage_bucket": "expense-receipts",
                "receipt_storage_object_path": path, "status": "Pending",
            })
        except Exception:
            await self.storage.remove("expense-receipts", path)
            raise
        return Expense.model_validate(row)

    async def review_expense(
        self, expense_id: UUID, admin: CurrentUser, decision: ExpenseStatus
    ) -> Expense:
        return Expense.model_validate(await self._rpc("fixit_review_expense", {
            "p_expense_id": str(expense_id), "p_admin_id": str(admin.id),
            "p_status": decision.value,
        }))

    async def pending_expenses(self) -> list[Expense]:
        return [Expense.model_validate(row) for row in await self._list_pending("expenses")]

    async def _list_pending(self, table: str) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/{table}", headers=self._headers(),
                    params={"select": "*", "status": "eq.Pending", "order": "created_at.asc"},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code != 200 or not isinstance(response.json(), list):
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        return response.json()

    async def expense_receipt(self, expense_id: UUID) -> tuple[bytes, str]:
        return await self._private_media_for_row(
            "expenses", expense_id, "receipt_storage_bucket", "receipt_storage_object_path"
        )

    async def transparency(self, currency: str) -> TransparencySummary:
        query_currency = currency.upper()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                donations, expenses, reports = await __import__("asyncio").gather(
                    client.get(f"{self.base_url}/rest/v1/donations", headers=self._headers(), params={"select": "amount", "status": "eq.Verified", "currency": f"eq.{query_currency}"}),
                    client.get(f"{self.base_url}/rest/v1/expenses", headers=self._headers(), params={"select": "amount", "status": "eq.Approved", "currency": f"eq.{query_currency}"}),
                    client.get(f"{self.base_url}/rest/v1/problem_reports", headers=self._headers(), params={"select": "id,tracking_id,category,status,work_records!inner(completed_at,public_summary,verification_status)", "status": "eq.Solved", "work_records.verification_status": "eq.Approved", "order": "updated_at.desc"}),
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if any(response.status_code != 200 for response in (donations, expenses, reports)):
            raise HTTPException(status_code=502, detail="Supabase database request failed")
        works = []
        for row in reports.json():
            records = row.pop("work_records", [])
            approved = next((r for r in records if r.get("verification_status") == "Approved"), None)
            if approved and approved.get("public_summary"):
                works.append(PublicWork(
                    report_id=row["id"], tracking_id=row["tracking_id"],
                    category=row.get("category"), status=row["status"],
                    description=approved["public_summary"],
                    completed_at=approved.get("completed_at"),
                ))
        return TransparencySummary(
            currency=query_currency,
            verified_donations_total=sum((Decimal(str(r["amount"])) for r in donations.json()), Decimal("0")),
            approved_spending_total=sum((Decimal(str(r["amount"])) for r in expenses.json()), Decimal("0")),
            completed_work=works,
        )

    async def public_work_evidence(self, report_id: UUID, stage: str) -> tuple[bytes, str]:
        if stage not in {"before", "after"}:
            raise HTTPException(status_code=422, detail="Evidence stage must be before or after")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            approved = await client.get(
                f"{self.base_url}/rest/v1/work_records", headers=self._headers(),
                params={"select": "id", "report_id": f"eq.{report_id}", "verification_status": "eq.Approved", "limit": "1"},
            )
            media = await client.get(
                f"{self.base_url}/rest/v1/report_media", headers=self._headers(),
                params={"select": "storage_bucket,storage_object_path", "report_id": f"eq.{report_id}", "stage": f"eq.{stage}", "order": "created_at.desc", "limit": "1"},
            )
        if approved.status_code != 200 or not approved.json():
            raise HTTPException(status_code=404, detail="Approved work not found")
        if media.status_code != 200 or not media.json():
            raise HTTPException(status_code=404, detail="Work evidence not found")
        item = media.json()[0]
        return await self.storage.download(item["storage_bucket"], item["storage_object_path"])
