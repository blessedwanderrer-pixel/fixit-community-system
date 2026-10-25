from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.report_workflow import (
    ensure_cancellable,
    ensure_transition_allowed,
)
from app.core.duplicate_detection import DuplicateComparableReport, is_possible_duplicate
from app.core.security import AppRole, CurrentUser, get_current_user
from app.main import app
from app.models.reports import (
    CitizenTrackingReport,
    EvidenceCreate,
    MergeResult,
    MediaReference,
    MediaStage,
    ProblemReport,
    ReportCreate,
    ReportStatus,
    WorkSchedule,
    WorkTransition,
    WorkVerificationDecision,
    WorkVerificationReview,
    WorkVerificationStatus,
)
from app.services.reports import get_report_service


def user(role: AppRole, user_id: str) -> CurrentUser:
    now = datetime.now(UTC)
    return CurrentUser(
        id=UUID(user_id),
        email=f"{role.value}@example.test",
        role=role,
        created_at=now,
        updated_at=now,
        access_token="mock-token",
    )


CITIZEN_A = user(AppRole.CITIZEN, "10000000-0000-4000-8000-000000000001")
CITIZEN_B = user(AppRole.CITIZEN, "10000000-0000-4000-8000-000000000002")
ADMIN = user(AppRole.ADMIN, "10000000-0000-4000-8000-000000000003")
COORDINATOR = user(AppRole.COORDINATOR, "10000000-0000-4000-8000-000000000004")


class MemoryReportService:
    def __init__(self) -> None:
        self.reports: dict[UUID, ProblemReport] = {}
        self.counter = 0
        self.assigned: dict[UUID, UUID] = {}
        self.reporters: dict[UUID, set[UUID]] = {}
        self.duplicate_candidates: dict[UUID, set[UUID]] = {}
        self.stored_evidence: set[tuple[UUID, MediaStage, str]] = set()
        self.verifications: dict[UUID, dict[str, object]] = {}

    async def create(self, citizen: CurrentUser, data: ReportCreate) -> ProblemReport:
        self.counter += 1
        now = datetime.now(UTC)
        submitted = DuplicateComparableReport(
            category=data.category,
            latitude=data.latitude,
            longitude=data.longitude,
            status=ReportStatus.SUBMITTED,
        )
        candidates = {
            existing.id
            for existing in self.reports.values()
            if is_possible_duplicate(
                submitted,
                DuplicateComparableReport(
                    category=existing.category or "",
                    latitude=existing.latitude,
                    longitude=existing.longitude,
                    status=existing.status,
                ),
            )
            and existing.merged_into_report_id is None
        }
        report = ProblemReport(
            id=uuid4(),
            tracking_id=f"FIX-{self.counter:012d}",
            created_by=citizen.id,
            description=data.description,
            category=data.category,
            latitude=data.latitude,
            longitude=data.longitude,
            status=ReportStatus.SUBMITTED,
            status_changed_by=None,
            status_changed_at=now,
            merged_into_report_id=None,
            created_at=now,
            updated_at=now,
            media=[
                MediaReference(
                    stage=MediaStage.REPORT,
                    storage_bucket="report-media",
                    storage_object_path=data.photo_reference,
                )
            ],
            possible_duplicate=bool(candidates),
            duplicate_candidate_count=len(candidates),
        )
        self.reports[report.id] = report
        self.reporters[report.id] = {citizen.id}
        self.duplicate_candidates[report.id] = candidates
        return report

    async def list_citizen_reports(self, citizen: CurrentUser) -> list[ProblemReport]:
        return [
            report
            for report in self.reports.values()
            if citizen.id in self.reporters.get(report.id, set())
        ]

    async def get_citizen_report(
        self, report_id: UUID, citizen: CurrentUser
    ) -> ProblemReport:
        report = self.reports.get(report_id)
        if report is None or citizen.id not in self.reporters.get(report_id, set()):
            raise HTTPException(status_code=404, detail="Report not found")
        return report

    async def track_citizen_report(
        self, tracking_id: str, citizen: CurrentUser
    ) -> CitizenTrackingReport:
        report = next(
            (
                item for item in self.reports.values()
                if item.tracking_id == tracking_id
                and citizen.id in self.reporters.get(item.id, set())
            ),
            None,
        )
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found")
        return CitizenTrackingReport(
            tracking_id=report.tracking_id,
            category=report.category,
            status=report.status,
            created_at=report.created_at,
            status_changed_at=report.status_changed_at,
        )

    async def admin_report_photo(self, report_id: UUID) -> tuple[bytes, str]:
        report = self.reports.get(report_id)
        if report is None or not any(
            item.stage is MediaStage.REPORT for item in report.media
        ):
            raise HTTPException(status_code=404, detail="Submitted problem photo not found")
        return b"sanitized-report-image", "image/jpeg"

    async def merge_duplicate(
        self, report_id: UUID, target_report_id: UUID, admin: CurrentUser
    ) -> MergeResult:
        if target_report_id not in self.duplicate_candidates.get(report_id, set()):
            raise HTTPException(status_code=409, detail="DUPLICATE_CANDIDATE_REQUIRED")
        source = self.reports[report_id]
        target = self.reports[target_report_id]
        source.merged_into_report_id = target_report_id
        source.status = ReportStatus.CANCELLED
        source.status_changed_by = admin.id
        self.reporters[target_report_id].update(self.reporters[report_id])
        return MergeResult(
            target_report=target,
            merged_report_id=report_id,
            reporters_preserved=len(self.reporters[target_report_id]),
        )

    async def cancel(self, report_id: UUID, citizen: CurrentUser) -> ProblemReport:
        report = await self.get_citizen_report(report_id, citizen)
        ensure_cancellable(report)
        report.status = ReportStatus.CANCELLED
        report.status_changed_by = citizen.id
        return report

    async def list_submitted(self) -> list[ProblemReport]:
        return [r for r in self.reports.values() if r.status is ReportStatus.SUBMITTED]

    async def decide(
        self, report_id: UUID, admin: CurrentUser, decision: ReportStatus
    ) -> ProblemReport:
        report = self.reports[report_id]
        ensure_transition_allowed(report.status, decision)
        report.status = decision
        report.status_changed_by = admin.id
        return report

    async def list_coordinator_reports(
        self, coordinator: CurrentUser
    ) -> list[ProblemReport]:
        return [
            report
            for report in self.reports.values()
            if report.status is ReportStatus.APPROVED
            or self.assigned.get(report.id) == coordinator.id
        ]

    async def schedule(
        self, report_id: UUID, coordinator: CurrentUser, _: WorkSchedule
    ) -> ProblemReport:
        report = self.reports[report_id]
        ensure_transition_allowed(report.status, ReportStatus.SCHEDULED)
        self.assigned[report.id] = coordinator.id
        report.status = ReportStatus.SCHEDULED
        report.status_changed_by = coordinator.id
        return report

    async def add_evidence(
        self, report_id: UUID, coordinator: CurrentUser, data: EvidenceCreate
    ) -> dict[str, object]:
        if self.assigned.get(report_id) != coordinator.id:
            raise HTTPException(status_code=403, detail="REPORT_FORBIDDEN")
        media = MediaReference(
            id=uuid4(),
            stage=data.stage,
            storage_bucket="report-media",
            storage_object_path=data.photo_reference,
            created_at=datetime.now(UTC),
        )
        self.reports[report_id].media.append(media)
        self.stored_evidence.add((report_id, data.stage, data.photo_reference))
        return media.model_dump()

    async def valid_evidence_stages(
        self, report: ProblemReport
    ) -> set[MediaStage]:
        return {
            item.stage
            for item in report.media
            if (
                item.stage in {MediaStage.BEFORE, MediaStage.AFTER}
                and item.storage_bucket == "report-media"
                and item.storage_object_path.startswith(f"{report.id}/")
                and (
                    report.id, item.stage, item.storage_object_path
                ) in self.stored_evidence
            )
        }

    async def upload_evidence(
        self, report_id: UUID, coordinator: CurrentUser, stage: MediaStage, upload
    ) -> dict[str, object]:
        return await self.add_evidence(
            report_id, coordinator,
            EvidenceCreate(stage=stage, photo_reference=f"{report_id}/{stage.value}.jpg"),
        )

    async def transition(
        self, report_id: UUID, coordinator: CurrentUser, data: WorkTransition
    ) -> ProblemReport:
        if self.assigned.get(report_id) != coordinator.id:
            raise HTTPException(status_code=403, detail="REPORT_FORBIDDEN")
        report = self.reports[report_id]
        ensure_transition_allowed(report.status, data.status)
        if data.status is ReportStatus.SOLVED:
            valid_stages = await self.valid_evidence_stages(report)
            if not {MediaStage.BEFORE, MediaStage.AFTER}.issubset(valid_stages):
                raise HTTPException(
                    status_code=409, detail="MISSING_BEFORE_AFTER_EVIDENCE"
                )
        report.status = data.status
        report.status_changed_by = coordinator.id
        return report

    async def submit_work_verification(
        self, report_id: UUID, coordinator: CurrentUser, work_details: str | None
    ) -> dict[str, object]:
        report = self.reports[report_id]
        valid = await self.valid_evidence_stages(report)
        if not {MediaStage.BEFORE, MediaStage.AFTER}.issubset(valid):
            raise HTTPException(status_code=409, detail="MISSING_BEFORE_AFTER_EVIDENCE")
        now = datetime.now(UTC)
        self.verifications[report_id] = {
            "status": WorkVerificationStatus.PENDING,
            "reason": None,
            "summary": "FixIt field staff completed the reported repair.",
            "submitted_at": now,
            "work_details": work_details,
        }
        return self.verifications[report_id]

    async def list_work_verifications(self) -> list[WorkVerificationReview]:
        return [
            WorkVerificationReview(
                report_id=report_id,
                tracking_id=self.reports[report_id].tracking_id,
                category=self.reports[report_id].category,
                problem_description=self.reports[report_id].description,
                work_details=item["work_details"],
                public_summary=str(item["summary"]),
                submitted_at=item["submitted_at"],
                evidence_stages=sorted(await self.valid_evidence_stages(self.reports[report_id]), key=lambda stage: stage.value),
            )
            for report_id, item in self.verifications.items()
            if item["status"] is WorkVerificationStatus.PENDING
        ]

    async def review_work_verification(
        self, report_id: UUID, admin: CurrentUser, decision: WorkVerificationDecision
    ) -> dict[str, object]:
        if decision.decision is WorkVerificationStatus.OBJECTED and not (decision.reason or "").strip():
            raise HTTPException(status_code=422, detail="OBJECTION_REASON_REQUIRED")
        item = self.verifications[report_id]
        item["status"] = decision.decision
        item["reason"] = decision.reason
        if decision.decision is WorkVerificationStatus.APPROVED:
            self.reports[report_id].status = ReportStatus.SOLVED
            self.reports[report_id].status_changed_by = admin.id
        return item

    async def work_evidence(self, report_id: UUID, stage: MediaStage) -> tuple[bytes, str]:
        if stage not in await self.valid_evidence_stages(self.reports[report_id]):
            raise HTTPException(status_code=404, detail="Work evidence not found")
        return f"{stage.value}-evidence".encode(), "image/jpeg"


@pytest.fixture
def workflow_client() -> tuple[TestClient, MemoryReportService, dict[str, CurrentUser]]:
    service = MemoryReportService()
    active = {"user": CITIZEN_A}
    app.dependency_overrides[get_current_user] = lambda: active["user"]
    app.dependency_overrides[get_report_service] = lambda: service
    client = TestClient(app)
    try:
        yield client, service, active
    finally:
        app.dependency_overrides.clear()


def create_report(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/reports",
        json={
            "description": "Broken streetlight",
            "category": "Infrastructure",
            "latitude": 31.5204,
            "longitude": 74.3587,
            "photo_reference": "incoming/streetlight.jpg",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_citizen_creates_reports_with_unique_tracking_ids(workflow_client) -> None:
    client, _, _ = workflow_client
    first = create_report(client)
    second = create_report(client)

    assert first["tracking_id"].startswith("FIX-")
    assert second["tracking_id"].startswith("FIX-")
    assert first["tracking_id"] != second["tracking_id"]


def test_citizen_report_responses_exclude_sensitive_internal_fields(
    workflow_client,
) -> None:
    client, _, _ = workflow_client
    created = create_report(client)
    expected = {
        "id", "tracking_id", "description", "category", "status",
        "status_changed_at", "created_at", "updated_at", "possible_duplicate",
        "duplicate_candidate_count", "can_cancel",
    }
    forbidden = {
        "created_by", "latitude", "longitude", "status_changed_by",
        "merged_into_report_id", "media", "work_records", "storage_bucket",
        "storage_object_path", "ai_triage_status",
    }

    assert set(created) == expected
    assert forbidden.isdisjoint(created)
    listed = client.get("/api/reports")
    detail = client.get(f"/api/reports/{created['id']}")
    assert listed.status_code == 200
    assert detail.status_code == 200
    assert set(listed.json()[0]) == expected
    assert set(detail.json()) == expected


def test_coordinator_report_and_evidence_responses_exclude_sensitive_fields(
    workflow_client,
) -> None:
    client, service, active = workflow_client
    created = create_report(client)
    report = service.reports[UUID(str(created["id"]))]
    report.status = ReportStatus.APPROVED
    active["user"] = COORDINATOR

    queue_response = client.get("/api/coordinator/reports")
    assert queue_response.status_code == 200
    item = queue_response.json()[0]
    assert set(item) == {
        "id", "tracking_id", "description", "category", "status", "created_at",
        "updated_at", "assigned_to_current_user", "scheduled_for", "started_at",
        "completed_at", "work_details", "evidence_stages",
        "verification_status", "verification_reason", "public_summary",
        "submitted_for_verification_at",
    }
    forbidden = {
        "created_by", "latitude", "longitude", "status_changed_by",
        "merged_into_report_id", "media", "work_records", "storage_bucket",
        "storage_object_path", "coordinator_id",
    }
    assert forbidden.isdisjoint(item)

    service.assigned[report.id] = COORDINATOR.id
    report.status = ReportStatus.IN_PROGRESS
    evidence = client.post(
        f"/api/coordinator/reports/{report.id}/evidence/upload",
        data={"stage": "before"},
        files={"photo": ("before.jpg", b"sanitized", "image/jpeg")},
    )
    assert evidence.status_code == 200
    assert set(evidence.json()) == {"stage", "created_at"}
    assert forbidden.isdisjoint(evidence.json())


def test_admin_can_retrieve_private_submitted_report_photo(workflow_client) -> None:
    client, _, active = workflow_client
    report = create_report(client)
    active["user"] = ADMIN

    response = client.get(f"/api/admin/reports/{report['id']}/photo")

    assert response.status_code == 200
    assert response.content == b"sanitized-report-image"
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.headers["cache-control"] == "private, no-store"
    assert b"report-media" not in response.content
    assert b"incoming/streetlight.jpg" not in response.content


@pytest.mark.parametrize("blocked_user", [CITIZEN_A, COORDINATOR])
def test_non_admin_cannot_retrieve_submitted_report_photo(
    workflow_client, blocked_user: CurrentUser
) -> None:
    client, _, active = workflow_client
    report = create_report(client)
    active["user"] = blocked_user

    response = client.get(f"/api/admin/reports/{report['id']}/photo")

    assert response.status_code == 403
    assert "report-media" not in response.text
    assert "incoming/streetlight.jpg" not in response.text


def test_citizen_cannot_access_another_citizens_private_report(workflow_client) -> None:
    client, _, active = workflow_client
    report = create_report(client)
    active["user"] = CITIZEN_B

    response = client.get(f"/api/reports/{report['id']}")

    assert response.status_code == 404


def test_owner_and_linked_reporter_can_track_report(workflow_client) -> None:
    client, service, active = workflow_client
    original = create_report(client)

    owner_response = client.get(f"/api/reports/track/{original['tracking_id']}")
    assert owner_response.status_code == 200
    assert owner_response.json()["tracking_id"] == original["tracking_id"]

    service.reporters[UUID(str(original["id"]))].add(CITIZEN_B.id)
    active["user"] = CITIZEN_B
    linked_response = client.get(f"/api/reports/track/{original['tracking_id']}")
    assert linked_response.status_code == 200


def test_another_citizen_cannot_track_report(workflow_client) -> None:
    client, _, active = workflow_client
    report = create_report(client)
    active["user"] = CITIZEN_B

    response = client.get(f"/api/reports/track/{report['tracking_id']}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Report not found"}


def test_unknown_tracking_id_returns_same_not_found(workflow_client) -> None:
    client, _, _ = workflow_client

    response = client.get("/api/reports/track/FIX-000000000099")

    assert response.status_code == 404
    assert response.json() == {"detail": "Report not found"}


def test_tracking_response_does_not_leak_private_fields(workflow_client) -> None:
    client, _, _ = workflow_client
    report = create_report(client)

    response = client.get(f"/api/reports/track/{report['tracking_id']}")

    assert response.status_code == 200
    assert set(response.json()) == {
        "tracking_id", "category", "status", "created_at", "status_changed_at",
        "scheduled_for", "started_at", "completed_at", "work_details",
    }
    forbidden = {
        "id", "created_by", "latitude", "longitude", "media", "report_media",
        "storage_bucket", "storage_object_path", "possible_duplicate",
        "duplicate_candidate_count", "ai_triage_status", "status_changed_by",
        "merged_into_report_id", "work_records", "description",
    }
    assert forbidden.isdisjoint(response.json())


def test_submitted_report_can_be_cancelled(workflow_client) -> None:
    client, _, _ = workflow_client
    report = create_report(client)

    response = client.post(f"/api/reports/{report['id']}/cancel")

    assert response.status_code == 200
    assert response.json()["status"] == "Cancelled"


def test_processed_report_cannot_be_cancelled(workflow_client) -> None:
    client, service, _ = workflow_client
    report = create_report(client)
    service.reports[UUID(str(report["id"]))].status = ReportStatus.APPROVED

    response = client.post(f"/api/reports/{report['id']}/cancel")

    assert response.status_code == 409
    assert response.json() == {"detail": "CANCEL_REQUIRES_SUBMITTED"}


def test_coordinator_cannot_approve_or_reject(workflow_client) -> None:
    client, _, active = workflow_client
    report = create_report(client)
    active["user"] = COORDINATOR

    response = client.post(
        f"/api/admin/reports/{report['id']}/decision",
        json={"status": "Approved"},
    )

    assert response.status_code == 403


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/admin/reports/submitted", None),
        (
            "/api/coordinator/reports/10000000-0000-4000-8000-000000000099/schedule",
            {"scheduled_for": (datetime.now(UTC) + timedelta(days=1)).isoformat()},
        ),
    ],
)
def test_citizen_cannot_perform_staff_actions(workflow_client, path, payload) -> None:
    client, _, _ = workflow_client
    response = client.get(path) if payload is None else client.post(path, json=payload)

    assert response.status_code == 403


def test_invalid_coordinator_status_transition_is_rejected(workflow_client) -> None:
    client, service, active = workflow_client
    report_data = create_report(client)
    report = service.reports[UUID(str(report_data["id"]))]
    report.status = ReportStatus.SCHEDULED
    service.assigned[report.id] = COORDINATOR.id
    active["user"] = COORDINATOR

    response = client.post(
        f"/api/coordinator/reports/{report.id}/status",
        json={"status": "Solved"},
    )

    assert response.status_code == 422


def prepare_in_progress_report(workflow_client) -> tuple[TestClient, MemoryReportService, ProblemReport]:
    client, service, active = workflow_client
    report_data = create_report(client)
    report = service.reports[UUID(str(report_data["id"]))]
    report.status = ReportStatus.IN_PROGRESS
    service.assigned[report.id] = COORDINATOR.id
    active["user"] = COORDINATOR
    return client, service, report


def solve_report(client: TestClient, report_id: UUID):
    return client.post(
        f"/api/coordinator/reports/{report_id}/submit-verification",
        json={"work_details": "Completed repair"},
    )


def upload_evidence(client: TestClient, report_id: UUID, stage: str) -> None:
    response = client.post(
        f"/api/coordinator/reports/{report_id}/evidence/upload",
        data={"stage": stage},
        files={"photo": (f"{stage}.jpg", b"sanitized", "image/jpeg")},
    )
    assert response.status_code == 200


def test_solved_is_blocked_with_no_evidence(workflow_client) -> None:
    client, _, report = prepare_in_progress_report(workflow_client)

    response = solve_report(client, report.id)

    assert response.status_code == 409
    assert response.json() == {"detail": "MISSING_BEFORE_AFTER_EVIDENCE"}


def test_solved_is_blocked_with_before_evidence_only(workflow_client) -> None:
    client, _, report = prepare_in_progress_report(workflow_client)
    upload_evidence(client, report.id, "before")

    response = solve_report(client, report.id)

    assert response.status_code == 409
    assert response.json() == {"detail": "MISSING_BEFORE_AFTER_EVIDENCE"}


def test_solved_is_blocked_with_after_evidence_only(workflow_client) -> None:
    client, _, report = prepare_in_progress_report(workflow_client)
    upload_evidence(client, report.id, "after")

    response = solve_report(client, report.id)

    assert response.status_code == 409
    assert response.json() == {"detail": "MISSING_BEFORE_AFTER_EVIDENCE"}


def test_reference_only_evidence_does_not_allow_solved(workflow_client) -> None:
    client, _, report = prepare_in_progress_report(workflow_client)
    report.media.extend([
        MediaReference(
            stage=stage,
            storage_bucket="report-media",
            storage_object_path=f"{report.id}/{stage.value}-missing.jpg",
        )
        for stage in (MediaStage.BEFORE, MediaStage.AFTER)
    ])

    response = solve_report(client, report.id)

    assert response.status_code == 409
    assert response.json() == {"detail": "MISSING_BEFORE_AFTER_EVIDENCE"}


def test_evidence_from_another_report_does_not_allow_solved(workflow_client) -> None:
    client, service, active = workflow_client
    target_data = create_report(client)
    other_data = create_report(client)
    target = service.reports[UUID(str(target_data["id"]))]
    other = service.reports[UUID(str(other_data["id"]))]
    for report in (target, other):
        report.status = ReportStatus.IN_PROGRESS
        service.assigned[report.id] = COORDINATOR.id
    active["user"] = COORDINATOR
    upload_evidence(client, other.id, "before")
    upload_evidence(client, other.id, "after")

    response = solve_report(client, target.id)

    assert response.status_code == 409
    assert response.json() == {"detail": "MISSING_BEFORE_AFTER_EVIDENCE"}


def test_valid_coordinator_workflow_solves_with_both_evidence_photos(
    workflow_client,
) -> None:
    client, _, active = workflow_client
    report = create_report(client)

    active["user"] = ADMIN
    approved = client.post(
        f"/api/admin/reports/{report['id']}/decision",
        json={"status": "Approved"},
    )
    assert approved.status_code == 200

    active["user"] = COORDINATOR
    scheduled = client.post(
        f"/api/coordinator/reports/{report['id']}/schedule",
        json={"scheduled_for": (datetime.now(UTC) + timedelta(days=1)).isoformat()},
    )
    assert scheduled.status_code == 200
    assert scheduled.json()["status"] == "Scheduled"

    started = client.post(
        f"/api/coordinator/reports/{report['id']}/status",
        json={"status": "In Progress", "work_details": "Repair started"},
    )
    assert started.status_code == 200

    for stage in ("before", "after"):
        evidence = client.post(
            f"/api/coordinator/reports/{report['id']}/evidence/upload",
            data={"stage": stage},
            files={"photo": (f"{stage}.jpg", b"sanitized", "image/jpeg")},
        )
        assert evidence.status_code == 200

    submitted = client.post(
        f"/api/coordinator/reports/{report['id']}/submit-verification",
        json={"work_details": "Repair completed"},
    )
    assert submitted.status_code == 200

    active["user"] = ADMIN
    solved = client.post(
        f"/api/admin/work-verifications/{report['id']}",
        json={"decision": "Approved", "reason": None},
    )
    assert solved.status_code == 200
    assert client.get("/api/admin/work-verifications").json() == []


def test_fake_arbitrary_evidence_reference_is_rejected(workflow_client) -> None:
    client, service, active = workflow_client
    report_data = create_report(client)
    report = service.reports[UUID(str(report_data["id"]))]
    report.status = ReportStatus.IN_PROGRESS
    service.assigned[report.id] = COORDINATOR.id
    active["user"] = COORDINATOR
    response = client.post(
        f"/api/coordinator/reports/{report.id}/evidence",
        json={"stage": "before", "photo_reference": "fake/arbitrary.jpg"},
    )
    assert response.status_code == 422
    assert report.media[-1].stage is MediaStage.REPORT


def test_possible_duplicate_is_not_automatically_merged(workflow_client) -> None:
    client, service, active = workflow_client
    original = create_report(client)
    active["user"] = CITIZEN_B
    duplicate = create_report(client)

    duplicate_record = service.reports[UUID(str(duplicate["id"]))]
    original_record = service.reports[UUID(str(original["id"]))]
    assert duplicate["possible_duplicate"] is True
    assert duplicate["duplicate_candidate_count"] == 1
    assert duplicate_record.merged_into_report_id is None
    assert duplicate_record.status is ReportStatus.SUBMITTED
    assert original_record.status is ReportStatus.SUBMITTED


def test_admin_merge_preserves_all_reporters(workflow_client) -> None:
    client, service, active = workflow_client
    original = create_report(client)
    active["user"] = CITIZEN_B
    duplicate = create_report(client)
    active["user"] = ADMIN

    merged = client.post(
        f"/api/admin/reports/{duplicate['id']}/merge",
        json={"target_report_id": original["id"]},
    )

    assert merged.status_code == 200
    assert merged.json()["merged_report_id"] == duplicate["id"]
    assert merged.json()["reporters_preserved"] == 2
    assert service.reports[UUID(str(duplicate["id"]))].status is ReportStatus.CANCELLED

    active["user"] = CITIZEN_B
    preserved_visibility = client.get(f"/api/reports/{original['id']}")
    assert preserved_visibility.status_code == 200
