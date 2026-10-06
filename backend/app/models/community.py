from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ProblemAnalytics(BaseModel):
    total_reports: int
    awaiting_review_submitted: int
    approved: int
    scheduled: int
    in_progress: int
    solved: int
    duplicate_merged: int


class FinancialAnalytics(BaseModel):
    currency: str
    total_verified_donations: int
    total_verified_donation_amount: Decimal
    pending_donation_verification: int
    total_approved_spending: Decimal


class AdminAnalytics(BaseModel):
    problems: ProblemAnalytics
    financial: FinancialAnalytics


class UpcomingWork(BaseModel):
    tracking_id: str
    category: str | None
    status: str
    scheduled_for: datetime
    work_details: str | None


class Notification(BaseModel):
    id: UUID
    title: str
    body: str
    payload: dict[str, object]
    read_at: datetime | None
    created_at: datetime
    updated_at: datetime
