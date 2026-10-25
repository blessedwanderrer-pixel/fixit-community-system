from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.core.config import Settings, get_settings
from app.core.security import CurrentUser, require_admin, require_citizen, require_coordinator
from app.models.finance import (
    Donation, DonationReview, DonationStatus, Expense, ExpenseReview,
    ExpenseStatus, TransparencySummary,
)
from app.services.finance import FinanceService

router = APIRouter(prefix="/api", tags=["finance and transparency"])


def get_finance_service(settings: Settings = Depends(get_settings)) -> FinanceService:
    return FinanceService(settings)


@router.post("/donations", response_model=Donation, status_code=201)
async def submit_donation(
    transaction_id: str = Form(min_length=1), amount: Decimal = Form(gt=0),
    transaction_at: datetime = Form(), currency: str = Form(min_length=3, max_length=3),
    screenshot: UploadFile = File(), citizen: CurrentUser = Depends(require_citizen),
    service: FinanceService = Depends(get_finance_service),
) -> Donation:
    return await service.submit_donation(citizen, transaction_id, amount, currency, transaction_at, screenshot)


@router.post("/admin/donations/{donation_id}/review", response_model=Donation)
async def review_donation(
    donation_id: UUID, review: DonationReview, admin: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> Donation:
    if review.status not in {DonationStatus.VERIFIED, DonationStatus.REJECTED}:
        raise HTTPException(status_code=422, detail="Decision must be Verified or Rejected")
    return await service.review_donation(donation_id, admin, review.status)


@router.get("/admin/donations/pending", response_model=list[Donation])
async def pending_donations(
    _: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> list[Donation]:
    return await service.pending_donations()


@router.get("/admin/donations/{donation_id}/proof", response_class=Response)
async def donation_proof(
    donation_id: UUID, _: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> Response:
    content, content_type = await service.donation_proof(donation_id)
    return Response(content=content, media_type=content_type, headers={"Cache-Control": "private, no-store"})


@router.post("/coordinator/expenses", response_model=Expense, status_code=201)
async def submit_expense(
    report_id: UUID = Form(), amount: Decimal = Form(gt=0),
    description: str = Form(min_length=1), currency: str = Form(min_length=3, max_length=3),
    receipt: UploadFile = File(), coordinator: CurrentUser = Depends(require_coordinator),
    service: FinanceService = Depends(get_finance_service),
) -> Expense:
    return await service.submit_expense(coordinator, report_id, amount, currency, description, receipt)


@router.post("/admin/expenses/{expense_id}/review", response_model=Expense)
async def review_expense(
    expense_id: UUID, review: ExpenseReview, admin: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> Expense:
    if review.status not in {ExpenseStatus.APPROVED, ExpenseStatus.REJECTED}:
        raise HTTPException(status_code=422, detail="Decision must be Approved or Rejected")
    return await service.review_expense(expense_id, admin, review.status)


@router.get("/admin/expenses/pending", response_model=list[Expense])
async def pending_expenses(
    _: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> list[Expense]:
    return await service.pending_expenses()


@router.get("/admin/expenses/{expense_id}/receipt", response_class=Response)
async def expense_receipt(
    expense_id: UUID, _: CurrentUser = Depends(require_admin),
    service: FinanceService = Depends(get_finance_service),
) -> Response:
    content, content_type = await service.expense_receipt(expense_id)
    return Response(content=content, media_type=content_type, headers={"Cache-Control": "private, no-store"})


@router.get("/transparency", response_model=TransparencySummary)
async def transparency(
    currency: str = Query(min_length=3, max_length=3),
    service: FinanceService = Depends(get_finance_service),
) -> TransparencySummary:
    if len(currency) != 3 or not currency.isalpha():
        raise HTTPException(status_code=422, detail="currency must be a three-letter code")
    return await service.transparency(currency)


@router.get("/completed-work/{report_id}/evidence/{stage}", response_class=Response)
async def public_completed_work_evidence(
    report_id: UUID,
    stage: str,
    service: FinanceService = Depends(get_finance_service),
) -> Response:
    content, content_type = await service.public_work_evidence(report_id, stage)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=300"},
    )
