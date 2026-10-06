from typing import Any
from uuid import UUID
from uuid import uuid4

import httpx
from fastapi import Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.report_workflow import (
    ensure_cancellable,
    ensure_transition_allowed,
)
from app.core.security import CurrentUser
from app.models.reports import (
    AITriageRecord,
    AdminReportReview,
    CitizenTrackingReport,
    DuplicateCandidate,
    EvidenceCreate,
    MediaStage,
    MergeResult,
    ProblemReport,
    ReportCreate,
    ReportStatus,
    WorkSchedule,
    WorkTransition,
)
from app.services.triage import AITriageError, GroqTriageService
from app.services.storage import StorageService

REPORT_SELECT = (
    "id,tracking_id,created_by,description,category,latitude,longitude,status,"
    "status_changed_by,status_changed_at,merged_into_report_id,created_at,updated_at,"
    "report_media(id,stage,storage_bucket,storage_object_path,created_at),"
    "work_records(id,coordinator_id,scheduled_for,started_at,completed_at,notes,created_at,updated_at)"
)


class ReportService:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_publishable_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured",
            )
        self.base_url = settings.supabase_url.rstrip("/")
        self.publishable_key = settings.supabase_publishable_key
        self.secret_key = settings.supabase_secret_key
        self.timeout = settings.supabase_request_timeout_seconds
        self.triage = GroqTriageService(settings)
        self.storage = StorageService(settings) if settings.supabase_secret_key else None

    def _service_headers(self) -> dict[str, str]:
        if not self.secret_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase backend credentials are not configured",
            )
        headers = {"apikey": self.secret_key, "Content-Type": "application/json"}
        if self.secret_key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.secret_key}"
        return headers

    def _user_headers(self, user: CurrentUser) -> dict[str, str]:
        if not user.access_token:
            raise HTTPException(status_code=401, detail="Bearer token required")
        return {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {user.access_token}",
        }

    @staticmethod
    def _normalize_report(payload: dict[str, Any]) -> ProblemReport:
        data = dict(payload)
        data["media"] = data.pop("report_media", data.get("media", []))
        return ProblemReport.model_validate(data)

    @staticmethod
    def _raise_supabase_error(response: httpx.Response) -> None:
        try:
            message = response.json().get("message", "SUPABASE_REQUEST_FAILED")
        except (AttributeError, ValueError):
            message = "SUPABASE_REQUEST_FAILED"

        status_map = {
            "REPORT_NOT_FOUND": 404,
            "REPORT_FORBIDDEN": 403,
            "CITIZEN_REQUIRED": 403,
            "ADMIN_REQUIRED": 403,
            "COORDINATOR_REQUIRED": 403,
            "CANCEL_REQUIRES_SUBMITTED": 409,
            "DECISION_REQUIRES_SUBMITTED": 409,
            "SCHEDULE_REQUIRES_APPROVED": 409,
            "INVALID_STATUS_TRANSITION": 409,
            "MISSING_BEFORE_AFTER_EVIDENCE": 409,
            "EVIDENCE_REQUIRES_ACTIVE_WORK": 409,
            "INVALID_ADMIN_DECISION": 422,
            "INVALID_EVIDENCE_STAGE": 422,
            "INVALID_MERGE_TARGET": 422,
            "REPORT_ALREADY_MERGED": 409,
            "MERGE_TARGET_NOT_ACTIVE": 409,
            "DUPLICATE_CANDIDATE_REQUIRED": 409,
        }
        if message in status_map:
            raise HTTPException(status_code=status_map[message], detail=message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase database request failed",
        )

    async def _rpc(self, name: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/{name}",
                    headers=self._service_headers(),
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 201}:
            self._raise_supabase_error(response)
        result = response.json()
        if not isinstance(result, dict):
            raise HTTPException(status_code=502, detail="Invalid Supabase database response")
        return result

    async def _query_reports(
        self, params: dict[str, str], headers: dict[str, str]
    ) -> list[ProblemReport]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/problem_reports",
                    headers=headers,
                    params={"select": REPORT_SELECT, "order": "created_at.desc", **params},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code != 200:
            self._raise_supabase_error(response)
        payload = response.json()
        if not isinstance(payload, list):
            raise HTTPException(status_code=502, detail="Invalid Supabase database response")
        return [self._normalize_report(item) for item in payload]

    async def _get_report_as_service(self, report_id: UUID) -> ProblemReport:
        reports = await self._query_reports(
            {"id": f"eq.{report_id}"}, self._service_headers()
        )
        if not reports:
            raise HTTPException(status_code=404, detail="Report not found")
        return reports[0]

    async def create(self, user: CurrentUser, data: ReportCreate) -> ProblemReport:
        if self.storage is None or not await self.storage.exists("report-media", data.photo_reference):
            raise HTTPException(status_code=422, detail="A persisted sanitized report photo is required")
        payload = await self._rpc(
            "fixit_create_report",
            {
                "p_citizen_id": str(user.id),
                "p_description": data.description,
                "p_category": data.category,
                "p_latitude": data.latitude,
                "p_longitude": data.longitude,
                "p_photo_reference": data.photo_reference,
            },
        )
        report = self._normalize_report(payload)
        try:
            triage_result = await self.triage.analyze(data)
            await self._save_triage(report.id, triage_result.model_dump())
            report.ai_triage_status = "completed"
        except (AITriageError, HTTPException):
            report.ai_triage_status = "failed"
        return report

    async def create_with_photo(
        self, user: CurrentUser, data: ReportCreate, upload: Any
    ) -> ProblemReport:
        if self.storage is None:
            raise HTTPException(status_code=503, detail="Supabase Storage is not configured")
        report_id = uuid4()
        clean = await self.storage.sanitize(upload)
        path = await self.storage.upload("report-media", str(report_id), clean)
        try:
            payload = await self._rpc("fixit_create_report_uploaded", {
                "p_report_id": str(report_id), "p_citizen_id": str(user.id),
                "p_description": data.description, "p_category": data.category,
                "p_latitude": data.latitude, "p_longitude": data.longitude,
                "p_photo_reference": path,
            })
        except Exception:
            await self.storage.remove("report-media", path)
            raise
        report = self._normalize_report(payload)
        try:
            triage_result = await self.triage.analyze(data)
            await self._save_triage(report.id, triage_result.model_dump())
            report.ai_triage_status = "completed"
        except (AITriageError, HTTPException):
            report.ai_triage_status = "failed"
        return report

    async def _save_triage(self, report_id: UUID, result: dict[str, str]) -> None:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/ai_triage_results",
                    headers={**self._service_headers(), "Prefer": "return=minimal"},
                    json={"report_id": str(report_id), "result": result},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if response.status_code not in {200, 201, 204}:
            self._raise_supabase_error(response)

    async def list_citizen_reports(self, user: CurrentUser) -> list[ProblemReport]:
        return await self._query_reports({}, self._user_headers(user))

    async def get_citizen_report(self, report_id: UUID, user: CurrentUser) -> ProblemReport:
        reports = await self._query_reports(
            {"id": f"eq.{report_id}"}, self._user_headers(user)
        )
        if not reports:
            raise HTTPException(status_code=404, detail="Report not found")
        return reports[0]

    async def admin_report_photo(self, report_id: UUID) -> tuple[bytes, str]:
        if self.storage is None:
            raise HTTPException(status_code=503, detail="Supabase Storage is not configured")
        report = await self._get_report_as_service(report_id)
        photo = next(
            (item for item in report.media if item.stage.value == "report"),
            None,
        )
        if photo is None:
            raise HTTPException(status_code=404, detail="Submitted problem photo not found")
        return await self.storage.download(
            photo.storage_bucket, photo.storage_object_path
        )

    async def track_citizen_report(
        self, tracking_id: str, user: CurrentUser
    ) -> CitizenTrackingReport:
        reports = await self._query_reports(
            {"tracking_id": f"eq.{tracking_id}"}, self._user_headers(user)
        )
        if not reports:
            raise HTTPException(status_code=404, detail="Report not found")

        report = reports[0]
        work = max(report.work_records, key=lambda item: item.updated_at, default=None)
        return CitizenTrackingReport(
            tracking_id=report.tracking_id,
            category=report.category,
            status=report.status,
            created_at=report.created_at,
            status_changed_at=report.status_changed_at,
            scheduled_for=work.scheduled_for if work else None,
            started_at=work.started_at if work else None,
            completed_at=work.completed_at if work else None,
            work_details=work.notes if work else None,
        )

    async def cancel(self, report_id: UUID, user: CurrentUser) -> ProblemReport:
        current = await self.get_citizen_report(report_id, user)
        if current.created_by != user.id:
            raise HTTPException(status_code=403, detail="Report cannot be cancelled by this user")
        ensure_cancellable(current)
        payload = await self._rpc(
            "fixit_cancel_report",
            {"p_report_id": str(report_id), "p_citizen_id": str(user.id)},
        )
        return self._normalize_report(payload)

    async def list_submitted(self) -> list[ProblemReport]:
        return await self._query_reports(
            {"status": "eq.Submitted"}, self._service_headers()
        )

    async def get_admin_review(self, report_id: UUID) -> AdminReportReview:
        report = await self._get_report_as_service(report_id)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                duplicate_response = await client.get(
                    f"{self.base_url}/rest/v1/report_duplicate_candidates",
                    headers=self._service_headers(),
                    params={
                        "select": "id,candidate_report_id,distance_meters,status,created_at",
                        "report_id": f"eq.{report_id}",
                        "status": "eq.Possible Duplicate",
                        "order": "distance_meters.asc",
                    },
                )
                triage_response = await client.get(
                    f"{self.base_url}/rest/v1/ai_triage_results",
                    headers=self._service_headers(),
                    params={
                        "select": "id,result,created_at",
                        "report_id": f"eq.{report_id}",
                        "order": "created_at.desc",
                        "limit": "1",
                    },
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if duplicate_response.status_code != 200:
            self._raise_supabase_error(duplicate_response)
        if triage_response.status_code != 200:
            self._raise_supabase_error(triage_response)

        candidates: list[DuplicateCandidate] = []
        for item in duplicate_response.json():
            candidate_report = await self._get_report_as_service(UUID(item["candidate_report_id"]))
            candidates.append(
                DuplicateCandidate(
                    id=item["id"],
                    candidate_report=candidate_report,
                    distance_meters=item["distance_meters"],
                    status=item["status"],
                    created_at=item["created_at"],
                )
            )
        triage_rows = triage_response.json()
        triage = AITriageRecord.model_validate(triage_rows[0]) if triage_rows else None
        return AdminReportReview(
            report=report,
            duplicate_candidates=candidates,
            ai_triage=triage,
        )

    async def merge_duplicate(
        self, report_id: UUID, target_report_id: UUID, admin: CurrentUser
    ) -> MergeResult:
        payload = await self._rpc(
            "fixit_merge_duplicate_report",
            {
                "p_report_id": str(report_id),
                "p_target_report_id": str(target_report_id),
                "p_admin_id": str(admin.id),
            },
        )
        merged_report_id = UUID(payload.pop("merged_report_id"))
        reporters_preserved = int(payload.pop("reporters_preserved"))
        return MergeResult(
            target_report=self._normalize_report(payload),
            merged_report_id=merged_report_id,
            reporters_preserved=reporters_preserved,
        )

    async def decide(
        self, report_id: UUID, admin: CurrentUser, decision: ReportStatus
    ) -> ProblemReport:
        current = await self._get_report_as_service(report_id)
        ensure_transition_allowed(current.status, decision)
        payload = await self._rpc(
            "fixit_admin_decide_report",
            {
                "p_report_id": str(report_id),
                "p_admin_id": str(admin.id),
                "p_decision": decision.value,
            },
        )
        return self._normalize_report(payload)

    async def list_coordinator_reports(self, coordinator: CurrentUser) -> list[ProblemReport]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                assignments = await client.get(
                    f"{self.base_url}/rest/v1/work_records",
                    headers=self._service_headers(),
                    params={
                        "select": "report_id",
                        "coordinator_id": f"eq.{coordinator.id}",
                    },
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase database unavailable") from exc
        if assignments.status_code != 200:
            self._raise_supabase_error(assignments)
        assigned_ids = [item["report_id"] for item in assignments.json()]
        approved = await self._query_reports(
            {"status": "eq.Approved"}, self._service_headers()
        )
        if not assigned_ids:
            return approved
        assigned = await self._query_reports(
            {"id": f"in.({','.join(assigned_ids)})"}, self._service_headers()
        )
        return list({report.id: report for report in [*approved, *assigned]}.values())

    async def schedule(
        self, report_id: UUID, coordinator: CurrentUser, data: WorkSchedule
    ) -> ProblemReport:
        current = await self._get_report_as_service(report_id)
        ensure_transition_allowed(current.status, ReportStatus.SCHEDULED)
        payload = await self._rpc(
            "fixit_schedule_report",
            {
                "p_report_id": str(report_id),
                "p_coordinator_id": str(coordinator.id),
                "p_scheduled_for": data.scheduled_for.isoformat(),
                "p_work_details": data.work_details,
            },
        )
        return self._normalize_report(payload)

    async def add_evidence(
        self, report_id: UUID, coordinator: CurrentUser, data: EvidenceCreate
    ) -> dict[str, Any]:
        return await self._rpc(
            "fixit_add_work_evidence",
            {
                "p_report_id": str(report_id),
                "p_coordinator_id": str(coordinator.id),
                "p_stage": data.stage.value,
                "p_photo_reference": data.photo_reference,
            },
        )

    async def upload_evidence(
        self, report_id: UUID, coordinator: CurrentUser, stage: Any, upload: Any
    ) -> dict[str, Any]:
        if self.storage is None:
            raise HTTPException(status_code=503, detail="Supabase Storage is not configured")
        clean = await self.storage.sanitize(upload)
        path = await self.storage.upload("report-media", str(report_id), clean)
        try:
            return await self._rpc("fixit_add_work_evidence", {
                "p_report_id": str(report_id),
                "p_coordinator_id": str(coordinator.id),
                "p_stage": stage.value,
                "p_photo_reference": path,
            })
        except Exception:
            await self.storage.remove("report-media", path)
            raise

    async def valid_evidence_stages(
        self, report: ProblemReport
    ) -> set[MediaStage]:
        if self.storage is None:
            raise HTTPException(status_code=503, detail="Supabase Storage is not configured")
        valid: set[MediaStage] = set()
        expected_prefix = f"{report.id}/"
        for item in report.media:
            if (
                item.stage not in {MediaStage.BEFORE, MediaStage.AFTER}
                or item.storage_bucket != "report-media"
                or not item.storage_object_path.startswith(expected_prefix)
            ):
                continue
            if await self.storage.exists(item.storage_bucket, item.storage_object_path):
                valid.add(item.stage)
        return valid

    async def transition(
        self, report_id: UUID, coordinator: CurrentUser, data: WorkTransition
    ) -> ProblemReport:
        current = await self._get_report_as_service(report_id)
        ensure_transition_allowed(current.status, data.status)
        if data.status is ReportStatus.SOLVED:
            valid_stages = await self.valid_evidence_stages(current)
            if not {MediaStage.BEFORE, MediaStage.AFTER}.issubset(valid_stages):
                raise HTTPException(
                    status_code=409, detail="MISSING_BEFORE_AFTER_EVIDENCE"
                )
        payload = await self._rpc(
            "fixit_advance_report",
            {
                "p_report_id": str(report_id),
                "p_coordinator_id": str(coordinator.id),
                "p_target_status": data.status.value,
                "p_work_details": data.work_details,
            },
        )
        return self._normalize_report(payload)


def get_report_service(settings: Settings = Depends(get_settings)) -> ReportService:
    return ReportService(settings)
