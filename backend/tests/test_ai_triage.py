from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import AppRole, CurrentUser
from app.models.reports import ReportCreate
from app.services.reports import ReportService
from app.services.triage import AITriageError, AITriageResult
from app.services.triage import GroqTriageService

REPORT_ID = "20000000-0000-4000-8000-000000000001"


def citizen() -> CurrentUser:
    now = datetime.now(UTC)
    return CurrentUser(
        id=UUID("20000000-0000-4000-8000-000000000002"),
        role=AppRole.CITIZEN,
        created_at=now,
        updated_at=now,
        access_token="test-token",
    )


def report_input() -> ReportCreate:
    return ReportCreate(
        description="Water leaking from a public pipe",
        category="Water",
        latitude=31.5204,
        longitude=74.3587,
        photo_reference="tests/report.jpg",
    )


def report_payload() -> dict[str, object]:
    now = datetime.now(UTC).isoformat()
    return {
        "id": REPORT_ID,
        "tracking_id": "FIX-AITRIAGE001",
        "created_by": str(citizen().id),
        "description": "Water leaking from a public pipe",
        "category": "Water",
        "latitude": 31.5204,
        "longitude": 74.3587,
        "status": "Submitted",
        "status_changed_by": None,
        "status_changed_at": now,
        "merged_into_report_id": None,
        "created_at": now,
        "updated_at": now,
        "media": [],
        "possible_duplicate": False,
        "duplicate_candidate_count": 0,
    }


@pytest.mark.anyio
async def test_ai_structured_result_is_validated_and_saved() -> None:
    service = ReportService(
        Settings(
            supabase_url="https://project.example.test",
            supabase_publishable_key="test-publishable",
            supabase_secret_key="test-secret",
            groq_api_key="test-groq",
        )
    )
    result = AITriageResult(
        short_summary="Public water pipe leak",
        suggested_category="Water",
        priority="high",
        community_private_scope="community",
        recommendation="Inspect and isolate the leaking pipe.",
        reason="The leak affects shared infrastructure.",
    )
    service._rpc = AsyncMock(return_value=report_payload())
    service.storage.exists = AsyncMock(return_value=True)
    service.triage.analyze = AsyncMock(return_value=result)
    service._save_triage = AsyncMock()

    created = await service.create(citizen(), report_input())

    assert created.status.value == "Submitted"
    assert created.ai_triage_status == "completed"
    service._save_triage.assert_awaited_once_with(UUID(REPORT_ID), result.model_dump())


@pytest.mark.anyio
async def test_failed_ai_call_does_not_destroy_submitted_report() -> None:
    service = ReportService(
        Settings(
            supabase_url="https://project.example.test",
            supabase_publishable_key="test-publishable",
            supabase_secret_key="test-secret",
            groq_api_key="test-groq",
        )
    )
    service._rpc = AsyncMock(return_value=report_payload())
    service.storage.exists = AsyncMock(return_value=True)
    service.triage.analyze = AsyncMock(side_effect=AITriageError("malformed output"))
    service._save_triage = AsyncMock()

    created = await service.create(citizen(), report_input())

    assert created.id == UUID(REPORT_ID)
    assert created.status.value == "Submitted"
    assert created.ai_triage_status == "failed"
    service._save_triage.assert_not_awaited()


def test_ai_schema_cannot_make_final_report_decision() -> None:
    with pytest.raises(ValidationError):
        AITriageResult.model_validate(
            {
                "short_summary": "Summary",
                "suggested_category": "Water",
                "priority": "high",
                "community_private_scope": "community",
                "recommendation": "Inspect",
                "reason": "Shared infrastructure",
                "status": "Approved",
            }
        )


@pytest.mark.anyio
async def test_groq_request_has_no_application_timeout_and_no_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {"calls": 0}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"short_summary":"Pipe leak","suggested_category":"Water",'
                                '"priority":"high","community_private_scope":"community",'
                                '"recommendation":"Inspect pipe","reason":"Shared infrastructure"}'
                            )
                        }
                    }
                ]
            }

    class FakeAsyncClient:
        def __init__(self, *, timeout: object) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, *_: object, **__: object) -> FakeResponse:
            captured["calls"] = int(captured["calls"]) + 1
            return FakeResponse()

    monkeypatch.setattr("app.services.triage.httpx.AsyncClient", FakeAsyncClient)
    service = GroqTriageService(Settings(groq_api_key="test-groq"))

    result = await service.analyze(report_input())

    assert result.short_summary == "Pipe leak"
    assert captured == {"calls": 1, "timeout": None}


@pytest.mark.anyio
async def test_ai_triage_accepts_pashto_and_preserves_structured_schema(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"short_summary":"Public water pipe leak",'
                                '"suggested_category":"Water & Civic Sanitation",'
                                '"priority":"high","community_private_scope":"community",'
                                '"recommendation":"Inspect the pipe",'
                                '"reason":"Shared infrastructure is leaking"}'
                            )
                        }
                    }
                ]
            }

    class FakeAsyncClient:
        def __init__(self, *, timeout: object) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, *_: object, **kwargs: object) -> FakeResponse:
            captured["payload"] = kwargs["json"]
            return FakeResponse()

    monkeypatch.setattr("app.services.triage.httpx.AsyncClient", FakeAsyncClient)
    service = GroqTriageService(Settings(groq_api_key="test-groq"))
    report = ReportCreate(
        description="زموږ په کوڅه کې د عامه اوبو پایپ لیک دی.",
        category="Water & Civic Sanitation",
        latitude=31.5204,
        longitude=74.3587,
        photo_reference="tests/report.jpg",
    )

    result = await service.analyze(report)

    assert result.model_dump().keys() == AITriageResult.model_fields.keys()
    assert result.suggested_category == "Water & Civic Sanitation"
    messages = captured["payload"]["messages"]  # type: ignore[index]
    assert "Pashto" in messages[0]["content"]  # type: ignore[index]
    assert "untrusted data" in messages[0]["content"]  # type: ignore[index]
    assert report.description in messages[1]["content"]  # type: ignore[index]


@pytest.mark.anyio
async def test_work_evidence_ai_compares_images_and_returns_advisory_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"choices": [{"message": {"content": (
                '{"before_image_description":"A leaking water pipe is visible.",'
                '"after_image_description":"A resurfaced road is visible.",'
                '"comparison_assessment":"The after image does not demonstrate a pipe repair.",'
                '"matches_reported_problem":false,"confidence":"high",'
                '"concerns":["After evidence appears unrelated to the reported leak."],'
                '"solved_work_description":"Residents reported a leaking pipeline.\\n'
                'The before evidence shows visible water leakage.\\n'
                'The coordinator reported completing repairs.\\n'
                'The after evidence shows a resurfaced road.\\n'
                'It does not visibly confirm pipeline work.\\n'
                'Administrator review is required."}'
            )}}]}

    class FakeAsyncClient:
        def __init__(self, *, timeout: object) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, *_: object, **kwargs: object) -> FakeResponse:
            captured["payload"] = kwargs["json"]
            return FakeResponse()

    monkeypatch.setattr("app.services.triage.httpx.AsyncClient", FakeAsyncClient)
    service = GroqTriageService(Settings(groq_api_key="test-groq"))

    result = await service.analyze_work_evidence(
        category="Water", problem_description="Pipeline leakage", work_details="Leak repaired",
        before_image=b"before", before_content_type="image/jpeg",
        after_image=b"after", after_content_type="image/png",
    )

    assert result.matches_reported_problem is False
    assert result.confidence == "high"
    assert len(result.solved_work_description.splitlines()) == 6
    payload = captured["payload"]  # type: ignore[assignment]
    assert payload["model"] == "qwen/qwen3.8-27b"  # type: ignore[index]
    assert payload["response_format"] == {"type": "json_object"}  # type: ignore[index]
    content = payload["messages"][1]["content"]  # type: ignore[index]
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert content[2]["image_url"]["url"].startswith("data:image/png;base64,")
