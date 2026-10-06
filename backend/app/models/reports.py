from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class ReportStatus(StrEnum):
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    SCHEDULED = "Scheduled"
    IN_PROGRESS = "In Progress"
    SOLVED = "Solved"
    CANCELLED = "Cancelled"


class MediaStage(StrEnum):
    REPORT = "report"
    BEFORE = "before"
    AFTER = "after"


class ReportCreate(BaseModel):
    description: str = Field(min_length=1)
    category: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_reference: str = Field(min_length=1)


class ReportDecision(BaseModel):
    status: ReportStatus


class DuplicateMerge(BaseModel):
    target_report_id: UUID


class WorkSchedule(BaseModel):
    scheduled_for: datetime
    work_details: str | None = None


class WorkTransition(BaseModel):
    status: ReportStatus
    work_details: str | None = None


class EvidenceCreate(BaseModel):
    stage: MediaStage
    photo_reference: str = Field(min_length=1)


class MediaReference(BaseModel):
    id: UUID | None = None
    stage: MediaStage
    storage_bucket: str
    storage_object_path: str
    created_at: datetime | None = None


class WorkRecord(BaseModel):
    id: UUID
    coordinator_id: UUID
    scheduled_for: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ProblemReport(BaseModel):
    id: UUID
    tracking_id: str
    created_by: UUID | None
    description: str
    category: str | None
    latitude: float
    longitude: float
    status: ReportStatus
    status_changed_by: UUID | None
    status_changed_at: datetime
    merged_into_report_id: UUID | None
    created_at: datetime
    updated_at: datetime
    media: list[MediaReference] = Field(default_factory=list)
    work_records: list[WorkRecord] = Field(default_factory=list)
    possible_duplicate: bool = False
    duplicate_candidate_count: int = 0
    ai_triage_status: str | None = None


class CitizenReportResponse(BaseModel):
    id: UUID
    tracking_id: str
    description: str
    category: str | None
    status: ReportStatus
    status_changed_at: datetime
    created_at: datetime
    updated_at: datetime
    possible_duplicate: bool = False
    duplicate_candidate_count: int = 0
    can_cancel: bool = False


class CoordinatorReportResponse(BaseModel):
    id: UUID
    tracking_id: str
    description: str
    category: str | None
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    assigned_to_current_user: bool = False
    scheduled_for: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    work_details: str | None = None
    evidence_stages: list[MediaStage] = Field(default_factory=list)


class CoordinatorEvidenceResponse(BaseModel):
    stage: MediaStage
    created_at: datetime | None = None


class CitizenTrackingReport(BaseModel):
    tracking_id: str
    category: str | None
    status: ReportStatus
    created_at: datetime
    status_changed_at: datetime
    scheduled_for: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    work_details: str | None = None


class DuplicateCandidate(BaseModel):
    id: UUID
    candidate_report: ProblemReport
    distance_meters: float
    status: str
    created_at: datetime


class AITriageRecord(BaseModel):
    id: UUID
    result: dict[str, str]
    created_at: datetime


class AdminReportReview(BaseModel):
    report: ProblemReport
    duplicate_candidates: list[DuplicateCandidate] = Field(default_factory=list)
    ai_triage: AITriageRecord | None = None


class MergeResult(BaseModel):
    target_report: ProblemReport
    merged_report_id: UUID
    reporters_preserved: int
