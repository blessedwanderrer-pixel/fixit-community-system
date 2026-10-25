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


class WorkVerificationStatus(StrEnum):
    PENDING = "Pending"
    APPROVED = "Approved"
    OBJECTED = "Objected"


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


class WorkVerificationSubmit(BaseModel):
    work_details: str | None = None


class WorkVerificationDecision(BaseModel):
    decision: WorkVerificationStatus
    reason: str | None = Field(default=None, max_length=1000)


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
    verification_status: WorkVerificationStatus | None = None
    verification_reason: str | None = None
    public_summary: str | None = None
    image_analysis: dict[str, object] | None = None
    submitted_for_verification_at: datetime | None = None
    verified_by: UUID | None = None
    verified_at: datetime | None = None
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
    verification_status: WorkVerificationStatus | None = None
    verification_reason: str | None = None
    public_summary: str | None = None
    submitted_for_verification_at: datetime | None = None


class CoordinatorEvidenceResponse(BaseModel):
    stage: MediaStage
    created_at: datetime | None = None


class WorkVerificationReview(BaseModel):
    report_id: UUID
    tracking_id: str
    category: str | None
    problem_description: str
    work_details: str | None
    public_summary: str
    image_analysis: dict[str, object] | None = None
    submitted_at: datetime
    evidence_stages: list[MediaStage]


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
