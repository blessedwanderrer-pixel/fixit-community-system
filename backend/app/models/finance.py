from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class DonationStatus(StrEnum):
    PENDING = "Pending"
    VERIFIED = "Verified"
    REJECTED = "Rejected"


class ExpenseStatus(StrEnum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class DonationReview(BaseModel):
    status: DonationStatus


class ExpenseReview(BaseModel):
    status: ExpenseStatus


class Donation(BaseModel):
    id: UUID
    donor_id: UUID | None
    transaction_id: str
    amount: Decimal
    currency: str
    transaction_at: datetime
    status: DonationStatus
    verified_by: UUID | None
    verified_at: datetime | None
    created_at: datetime


class Expense(BaseModel):
    id: UUID
    report_id: UUID
    submitted_by: UUID
    amount: Decimal
    currency: str
    description: str
    status: ExpenseStatus
    approved_by: UUID | None
    approved_at: datetime | None
    created_at: datetime


class PublicWork(BaseModel):
    tracking_id: str
    category: str | None
    status: str
    completed_at: datetime | None = None


class TransparencySummary(BaseModel):
    currency: str
    verified_donations_total: Decimal
    approved_spending_total: Decimal
    completed_work: list[PublicWork] = Field(default_factory=list)
