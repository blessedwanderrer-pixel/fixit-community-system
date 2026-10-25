import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.security import (
    CurrentUser,
    require_admin,
    require_citizen,
    require_coordinator,
)
from app.models.reports import (
    AdminReportReview,
    CitizenReportResponse,
    CitizenTrackingReport,
    CoordinatorEvidenceResponse,
    CoordinatorReportResponse,
    DuplicateMerge,
    EvidenceCreate,
    MediaStage,
    MergeResult,
    ProblemReport,
    ReportCreate,
    ReportDecision,
    ReportStatus,
    WorkSchedule,
    WorkTransition,
    WorkVerificationDecision,
    WorkVerificationReview,
    WorkVerificationSubmit,
)
from app.services.reports import ReportService, get_report_service

router = APIRouter(prefix="/api", tags=["problem reports"])


def _citizen_response(report: ProblemReport, citizen: CurrentUser) -> CitizenReportResponse:
    return CitizenReportResponse(
        id=report.id,
        tracking_id=report.tracking_id,
        description=report.description,
        category=report.category,
        status=report.status,
        status_changed_at=report.status_changed_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
        possible_duplicate=report.possible_duplicate,
        duplicate_candidate_count=report.duplicate_candidate_count,
        can_cancel=(
            report.status is ReportStatus.SUBMITTED and report.created_by == citizen.id
        ),
    )


def _coordinator_response(
    report: ProblemReport,
    coordinator: CurrentUser,
    evidence_stages: set[MediaStage],
) -> CoordinatorReportResponse:
    assignment = next(
        (
            record
            for record in report.work_records
            if record.coordinator_id == coordinator.id
        ),
        None,
    )
    return CoordinatorReportResponse(
        id=report.id,
        tracking_id=report.tracking_id,
        description=report.description,
        category=report.category,
        status=report.status,
        created_at=report.created_at,
        updated_at=report.updated_at,
        assigned_to_current_user=assignment is not None,
        scheduled_for=assignment.scheduled_for if assignment else None,
        started_at=assignment.started_at if assignment else None,
        completed_at=assignment.completed_at if assignment else None,
        work_details=assignment.notes if assignment else None,
        evidence_stages=sorted(evidence_stages, key=lambda stage: stage.value),
        verification_status=assignment.verification_status if assignment else None,
        verification_reason=assignment.verification_reason if assignment else None,
        public_summary=assignment.public_summary if assignment else None,
        submitted_for_verification_at=assignment.submitted_for_verification_at if assignment else None,
    )


@router.post("/reports", response_model=CitizenReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    data: ReportCreate,
    citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> CitizenReportResponse:
    return _citizen_response(await service.create(citizen, data), citizen)


@router.post("/reports/with-photo", response_model=CitizenReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report_with_photo(
    description: str = Form(min_length=1), category: str = Form(min_length=1),
    latitude: float = Form(ge=-90, le=90), longitude: float = Form(ge=-180, le=180),
    photo: UploadFile = File(), citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> CitizenReportResponse:
    data = ReportCreate(
        description=description, category=category, latitude=latitude,
        longitude=longitude, photo_reference="pending-sanitized-upload",
    )
    return _citizen_response(await service.create_with_photo(citizen, data, photo), citizen)


@router.get("/reports", response_model=list[CitizenReportResponse])
async def list_my_reports(
    citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> list[CitizenReportResponse]:
    reports = await service.list_citizen_reports(citizen)
    return [_citizen_response(report, citizen) for report in reports]


@router.get("/reports/track/{tracking_id}", response_model=CitizenTrackingReport)
async def track_my_report(
    tracking_id: str,
    citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> CitizenTrackingReport:
    normalized = tracking_id.strip().upper()
    if not re.fullmatch(r"FIX-[A-Z0-9]+", normalized):
        raise HTTPException(status_code=404, detail="Report not found")
    return await service.track_citizen_report(normalized, citizen)


@router.get("/reports/{report_id}", response_model=CitizenReportResponse)
async def get_my_report(
    report_id: UUID,
    citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> CitizenReportResponse:
    return _citizen_response(await service.get_citizen_report(report_id, citizen), citizen)


@router.post("/reports/{report_id}/cancel", response_model=CitizenReportResponse)
async def cancel_report(
    report_id: UUID,
    citizen: CurrentUser = Depends(require_citizen),
    service: ReportService = Depends(get_report_service),
) -> CitizenReportResponse:
    return _citizen_response(await service.cancel(report_id, citizen), citizen)


@router.get("/admin/reports/submitted", response_model=list[ProblemReport])
async def list_submitted_reports(
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> list[ProblemReport]:
    return await service.list_submitted()


@router.get("/admin/reports/{report_id}/review", response_model=AdminReportReview)
async def review_report(
    report_id: UUID,
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> AdminReportReview:
    return await service.get_admin_review(report_id)


@router.get("/admin/reports/{report_id}/photo", response_class=Response)
async def admin_report_photo(
    report_id: UUID,
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> Response:
    content, content_type = await service.admin_report_photo(report_id)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@router.post("/admin/reports/{report_id}/merge", response_model=MergeResult)
async def merge_duplicate_report(
    report_id: UUID,
    data: DuplicateMerge,
    admin: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> MergeResult:
    return await service.merge_duplicate(report_id, data.target_report_id, admin)


@router.post("/admin/reports/{report_id}/decision", response_model=ProblemReport)
async def decide_report(
    report_id: UUID,
    data: ReportDecision,
    admin: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> ProblemReport:
    if data.status not in {ReportStatus.APPROVED, ReportStatus.REJECTED}:
        raise HTTPException(status_code=422, detail="Decision must be Approved or Rejected")
    return await service.decide(report_id, admin, data.status)


@router.get("/coordinator/reports", response_model=list[CoordinatorReportResponse])
async def list_coordinator_reports(
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> list[CoordinatorReportResponse]:
    reports = await service.list_coordinator_reports(coordinator)
    return [
        _coordinator_response(
            report, coordinator, await service.valid_evidence_stages(report)
        )
        for report in reports
    ]


@router.post("/coordinator/reports/{report_id}/schedule", response_model=CoordinatorReportResponse)
async def schedule_report(
    report_id: UUID,
    data: WorkSchedule,
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> CoordinatorReportResponse:
    report = await service.schedule(report_id, coordinator, data)
    return _coordinator_response(
        report, coordinator, await service.valid_evidence_stages(report)
    )


@router.post(
    "/coordinator/reports/{report_id}/evidence", response_model=CoordinatorEvidenceResponse
)
async def add_work_evidence(
    report_id: UUID,
    data: EvidenceCreate,
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> Any:
    raise HTTPException(
        status_code=422,
        detail="SANITIZED_MEDIA_REQUIRED: use the evidence upload endpoint",
    )


@router.post(
    "/coordinator/reports/{report_id}/evidence/upload",
    response_model=CoordinatorEvidenceResponse,
)
async def upload_work_evidence(
    report_id: UUID, stage: MediaStage = Form(), photo: UploadFile = File(),
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> CoordinatorEvidenceResponse:
    if stage not in {MediaStage.BEFORE, MediaStage.AFTER}:
        raise HTTPException(status_code=422, detail="Evidence stage must be before or after")
    uploaded = await service.upload_evidence(report_id, coordinator, stage, photo)
    return CoordinatorEvidenceResponse.model_validate(uploaded)


@router.post("/coordinator/reports/{report_id}/submit-verification")
async def submit_work_verification(
    report_id: UUID,
    data: WorkVerificationSubmit,
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> dict[str, Any]:
    return await service.submit_work_verification(report_id, coordinator, data.work_details)


@router.post("/coordinator/reports/{report_id}/status", response_model=CoordinatorReportResponse)
async def transition_report(
    report_id: UUID,
    data: WorkTransition,
    coordinator: CurrentUser = Depends(require_coordinator),
    service: ReportService = Depends(get_report_service),
) -> CoordinatorReportResponse:
    if data.status is not ReportStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=422,
            detail="Coordinator may only start scheduled work",
        )
    report = await service.transition(report_id, coordinator, data)
    return _coordinator_response(
        report, coordinator, await service.valid_evidence_stages(report)
    )


@router.get("/admin/work-verifications", response_model=list[WorkVerificationReview])
async def list_work_verifications(
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> list[WorkVerificationReview]:
    return await service.list_work_verifications()


@router.post("/admin/work-verifications/{report_id}")
async def review_work_verification(
    report_id: UUID,
    data: WorkVerificationDecision,
    admin: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> dict[str, Any]:
    return await service.review_work_verification(report_id, admin, data)


@router.post("/admin/work-verifications/{report_id}/reanalyze")
async def reanalyze_work_verification(
    report_id: UUID,
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> dict[str, Any]:
    return await service.reanalyze_work_verification(report_id)


@router.get("/admin/work-verifications/{report_id}/evidence/{stage}", response_class=Response)
async def admin_work_evidence(
    report_id: UUID,
    stage: MediaStage,
    _: CurrentUser = Depends(require_admin),
    service: ReportService = Depends(get_report_service),
) -> Response:
    if stage not in {MediaStage.BEFORE, MediaStage.AFTER}:
        raise HTTPException(status_code=422, detail="Evidence stage must be before or after")
    content, content_type = await service.work_evidence(report_id, stage)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )
