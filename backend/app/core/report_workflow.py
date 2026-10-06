from fastapi import HTTPException

from app.models.reports import MediaStage, ProblemReport, ReportStatus

ALLOWED_TRANSITIONS: dict[ReportStatus, frozenset[ReportStatus]] = {
    ReportStatus.SUBMITTED: frozenset(
        {ReportStatus.APPROVED, ReportStatus.REJECTED, ReportStatus.CANCELLED}
    ),
    ReportStatus.APPROVED: frozenset({ReportStatus.SCHEDULED}),
    ReportStatus.SCHEDULED: frozenset({ReportStatus.IN_PROGRESS}),
    ReportStatus.IN_PROGRESS: frozenset({ReportStatus.SOLVED}),
}


def ensure_transition_allowed(current: ReportStatus, target: ReportStatus) -> None:
    if target not in ALLOWED_TRANSITIONS.get(current, frozenset()):
        raise HTTPException(status_code=409, detail="INVALID_STATUS_TRANSITION")


def ensure_cancellable(report: ProblemReport) -> None:
    if report.status is not ReportStatus.SUBMITTED:
        raise HTTPException(status_code=409, detail="CANCEL_REQUIRES_SUBMITTED")


def ensure_solve_evidence(report: ProblemReport) -> None:
    stages = {item.stage for item in report.media}
    if not {MediaStage.BEFORE, MediaStage.AFTER}.issubset(stages):
        raise HTTPException(status_code=409, detail="MISSING_BEFORE_AFTER_EVIDENCE")
