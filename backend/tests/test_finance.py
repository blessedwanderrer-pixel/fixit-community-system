from datetime import UTC, datetime
from decimal import Decimal
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.finance import get_finance_service
from app.core.security import AppRole, CurrentUser, get_current_user
from app.main import app
from app.models.finance import Donation, DonationStatus, Expense, ExpenseStatus, TransparencySummary


def actor(role: AppRole) -> CurrentUser:
    now = datetime.now(UTC)
    return CurrentUser(id=uuid4(), role=role, created_at=now, updated_at=now, access_token="test")


CITIZEN, ADMIN, COORDINATOR = actor(AppRole.CITIZEN), actor(AppRole.ADMIN), actor(AppRole.COORDINATOR)


class MemoryFinance:
    def __init__(self) -> None:
        self.donations = {}
        self.expenses = {}

    async def submit_donation(self, user, transaction_id, amount, currency, transaction_at, screenshot):
        if transaction_id in {d.transaction_id for d in self.donations.values()}:
            raise HTTPException(status_code=409, detail="Duplicate transaction_id")
        now = datetime.now(UTC)
        item = Donation(id=uuid4(), donor_id=user.id, transaction_id=transaction_id, amount=amount,
                        currency=currency, transaction_at=transaction_at, status="Pending",
                        verified_by=None, verified_at=None, created_at=now)
        self.donations[item.id] = item
        return item

    async def review_donation(self, item_id, admin, decision):
        item = self.donations[item_id]
        item.status, item.verified_by, item.verified_at = decision, admin.id, datetime.now(UTC)
        return item

    async def submit_expense(self, user, report_id, amount, currency, description, receipt):
        now = datetime.now(UTC)
        item = Expense(id=uuid4(), report_id=report_id, submitted_by=user.id, amount=amount,
                       currency=currency, description=description, status="Pending",
                       approved_by=None, approved_at=None, created_at=now)
        self.expenses[item.id] = item
        return item

    async def review_expense(self, item_id, admin, decision):
        item = self.expenses[item_id]
        item.status, item.approved_by, item.approved_at = decision, admin.id, datetime.now(UTC)
        return item

    async def transparency(self, currency):
        return TransparencySummary(
            currency=currency,
            verified_donations_total=sum((d.amount for d in self.donations.values() if d.status is DonationStatus.VERIFIED), Decimal(0)),
            approved_spending_total=sum((e.amount for e in self.expenses.values() if e.status is ExpenseStatus.APPROVED), Decimal(0)),
        )


@pytest.fixture
def finance_client():
    service, active = MemoryFinance(), {"user": CITIZEN}
    app.dependency_overrides[get_current_user] = lambda: active["user"]
    app.dependency_overrides[get_finance_service] = lambda: service
    with TestClient(app) as client:
        yield client, service, active
    app.dependency_overrides.clear()


def proof():
    return {"screenshot": ("proof.jpg", b"sanitized-image", "image/jpeg")}


def donation_data(transaction_id="TX-1"):
    return {"transaction_id": transaction_id, "amount": "125.50", "currency": "PKR",
            "transaction_at": datetime.now(UTC).isoformat()}


def test_valid_donation_is_pending_and_duplicate_transaction_rejected(finance_client):
    client, _, _ = finance_client
    first = client.post("/api/donations", data=donation_data(), files=proof())
    second = client.post("/api/donations", data=donation_data(), files=proof())
    assert first.status_code == 201 and first.json()["status"] == "Pending"
    assert second.status_code == 409


def test_only_admin_can_verify_or_reject_donation_and_audit_fields_recorded(finance_client):
    client, _, active = finance_client
    item = client.post("/api/donations", data=donation_data(), files=proof()).json()
    active["user"] = COORDINATOR
    assert client.post(f"/api/admin/donations/{item['id']}/review", json={"status": "Verified"}).status_code == 403
    active["user"] = ADMIN
    verified = client.post(f"/api/admin/donations/{item['id']}/review", json={"status": "Verified"})
    assert verified.status_code == 200
    assert verified.json()["verified_by"] == str(ADMIN.id) and verified.json()["verified_at"]


def test_rejected_and_pending_donations_excluded_verified_included_without_private_paths(finance_client):
    client, _, active = finance_client
    pending = client.post("/api/donations", data=donation_data("TX-P"), files=proof()).json()
    rejected = client.post("/api/donations", data=donation_data("TX-R"), files=proof()).json()
    verified = client.post("/api/donations", data=donation_data("TX-V"), files=proof()).json()
    active["user"] = ADMIN
    client.post(f"/api/admin/donations/{rejected['id']}/review", json={"status": "Rejected"})
    client.post(f"/api/admin/donations/{verified['id']}/review", json={"status": "Verified"})
    public = client.get("/api/transparency?currency=PKR")
    assert public.json()["verified_donations_total"] == "125.50"
    assert "screenshot" not in public.text and pending["status"] == "Pending"


def expense_data():
    return {"report_id": str(uuid4()), "amount": "80", "currency": "PKR", "description": "Materials"}


def test_expense_requires_receipt_and_coordinator_can_submit(finance_client):
    client, _, active = finance_client
    active["user"] = COORDINATOR
    assert client.post("/api/coordinator/expenses", data=expense_data()).status_code == 422
    response = client.post("/api/coordinator/expenses", data=expense_data(), files={"receipt": ("bill.jpg", b"image", "image/jpeg")})
    assert response.status_code == 201 and response.json()["status"] == "Pending"


def test_unauthorized_media_upload_is_rejected(finance_client):
    client, _, _ = finance_client
    response = client.post(
        "/api/coordinator/expenses", data=expense_data(),
        files={"receipt": ("bill.jpg", b"image", "image/jpeg")},
    )
    assert response.status_code == 403


def test_coordinator_cannot_approve_but_admin_can_approve_or_reject(finance_client):
    client, service, active = finance_client
    active["user"] = COORDINATOR
    first = client.post("/api/coordinator/expenses", data=expense_data(), files={"receipt": ("bill.jpg", b"image", "image/jpeg")}).json()
    assert client.post(f"/api/admin/expenses/{first['id']}/review", json={"status": "Approved"}).status_code == 403
    active["user"] = ADMIN
    approved = client.post(f"/api/admin/expenses/{first['id']}/review", json={"status": "Approved"})
    assert approved.json()["approved_by"] == str(ADMIN.id) and approved.json()["approved_at"]
    second = Expense(id=uuid4(), report_id=uuid4(), submitted_by=COORDINATOR.id, amount=Decimal(20), currency="PKR", description="Other", status="Pending", approved_by=None, approved_at=None, created_at=datetime.now(UTC))
    service.expenses[second.id] = second
    assert client.post(f"/api/admin/expenses/{second.id}/review", json={"status": "Rejected"}).json()["status"] == "Rejected"


def test_only_approved_expenses_are_public_and_receipt_is_not_exposed(finance_client):
    client, _, active = finance_client
    active["user"] = COORDINATOR
    pending = client.post("/api/coordinator/expenses", data=expense_data(), files={"receipt": ("bill.jpg", b"image", "image/jpeg")}).json()
    approved = client.post("/api/coordinator/expenses", data=expense_data(), files={"receipt": ("bill.jpg", b"image", "image/jpeg")}).json()
    active["user"] = ADMIN
    client.post(f"/api/admin/expenses/{approved['id']}/review", json={"status": "Approved"})
    public = client.get("/api/transparency?currency=PKR")
    assert public.json()["approved_spending_total"] == "80"
    assert "receipt" not in public.text and pending["status"] == "Pending"
