import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
import httpx
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes.voice import get_voice_service
from app.core.config import Settings
from app.core.security import AppRole, CurrentUser, require_citizen
from app.main import app
from app.models.voice import GeneratedComplaint, VoiceComplaintDraft
from app.services.voice import (
    VOICE_MAX_UPLOAD_BYTES,
    GroqVoiceComplaintService,
    VoiceComplaintError,
)


def citizen() -> CurrentUser:
    now = datetime.now(UTC)
    return CurrentUser(
        id=UUID("30000000-0000-4000-8000-000000000001"),
        role=AppRole.CITIZEN,
        created_at=now,
        updated_at=now,
        access_token="test-token",
    )


def test_voice_draft_requires_authenticated_citizen() -> None:
    response = TestClient(app).post(
        "/api/voice-complaints/draft",
        files={"audio": ("complaint.webm", b"audio", "audio/webm")},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Bearer token required"}


def test_voice_route_returns_reviewable_draft_without_submitting_report() -> None:
    service = AsyncMock(spec=GroqVoiceComplaintService)
    service.create_draft.return_value = VoiceComplaintDraft(
        language="ur",
        transcription="ہماری گلی میں پانی کی پائپ لیک ہو رہی ہے۔",
        description="ہماری گلی میں عوامی پانی کی پائپ لیک ہو رہی ہے۔",
        suggested_category="Water & Civic Sanitation",
    )
    app.dependency_overrides[require_citizen] = citizen
    app.dependency_overrides[get_voice_service] = lambda: service

    try:
        response = TestClient(app).post(
            "/api/voice-complaints/draft",
            files={"audio": ("complaint.webm", b"audio", "audio/webm")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "language": "ur",
        "transcription": "ہماری گلی میں پانی کی پائپ لیک ہو رہی ہے۔",
        "description": "ہماری گلی میں عوامی پانی کی پائپ لیک ہو رہی ہے۔",
        "suggested_category": "Water & Civic Sanitation",
    }
    service.create_draft.assert_awaited_once_with(
        language="ur",
        content_type="audio/webm",
        content=b"audio",
    )


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("language", "raw_transcription", "script_transcription", "description", "filename"),
    [
        (
            "ur",
            "سڑک پر بڑا pothole ہے۔",
            "سڑک پر بڑا pothole ہے۔",
            "سڑک پر ایک بڑا pothole ہے جو گاڑیوں کے لیے خطرہ ہے۔",
            "urdu-complaint.webm",
        ),
        (
            "ps",
            "په سړک کې لوی pothole دی.",
            "په سړک کې لوی pothole دی.",
            "په سړک کې یو لوی pothole دی چې موټرو ته خطر جوړوي.",
            "pashto-complaint.webm",
        ),
    ],
    ids=["urdu-regression", "pashto"],
)
async def test_voice_service_uses_selected_whisper_language_and_valid_category(
    monkeypatch: pytest.MonkeyPatch,
    language: str,
    raw_transcription: str,
    script_transcription: str,
    description: str,
    filename: str,
) -> None:
    requests: list[dict[str, object]] = []

    class FakeResponse:
        def __init__(self, payload: object) -> None:
            self.payload = payload

        def raise_for_status(self) -> None:
            return None

        def json(self) -> object:
            return self.payload

    responses = iter(
        [
            FakeResponse({"text": raw_transcription}),
            FakeResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "transcription_text": script_transcription,
                                        "description": description,
                                        "suggested_category": "Damaged Roads & Potholes",
                                    },
                                    ensure_ascii=False,
                                )
                            }
                        }
                    ]
                }
            ),
        ]
    )

    class FakeAsyncClient:
        def __init__(self, **kwargs: object) -> None:
            requests.append({"client": kwargs})

        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, url: str, **kwargs: object) -> FakeResponse:
            requests.append({"url": url, **kwargs})
            return next(responses)

    monkeypatch.setattr("app.services.voice.httpx.AsyncClient", FakeAsyncClient)
    service = GroqVoiceComplaintService(
        Settings(groq_api_key="test-groq", groq_model="openai/gpt-oss-20b")
    )

    result = await service.create_draft(
        language=language,  # type: ignore[arg-type]
        content_type="audio/webm;codecs=opus",
        content=b"fake-audio",
    )

    transcription_request = requests[1]
    assert transcription_request["url"] == "https://api.groq.com/openai/v1/audio/transcriptions"
    assert transcription_request["data"]["language"] == language  # type: ignore[index]
    assert transcription_request["data"]["model"] == "whisper-large-v3-turbo"  # type: ignore[index]
    assert transcription_request["files"]["file"][0] == filename  # type: ignore[index]
    assert result.language == language
    assert result.suggested_category == "Damaged Roads & Potholes"
    assert result.transcription == script_transcription
    assert result.description == description


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("content_type", "content", "message"),
    [
        ("text/plain", b"audio", "Unsupported audio format"),
        ("audio/webm", b"", "The recording is empty"),
        ("audio/webm", b"x" * (VOICE_MAX_UPLOAD_BYTES + 1), "The recording is too large"),
    ],
    ids=["unsupported-type", "empty-recording", "oversized-recording"],
)
async def test_voice_service_rejects_invalid_uploads_before_groq(
    content_type: str, content: bytes, message: str
) -> None:
    service = GroqVoiceComplaintService(Settings(groq_api_key="test-groq"))

    with pytest.raises(VoiceComplaintError, match=message):
        await service.create_draft(
            language="ur", content_type=content_type, content=content
        )


def test_generated_complaint_requires_urdu_and_existing_category() -> None:
    with pytest.raises(ValidationError):
        GeneratedComplaint(
            transcription_text="سڑک پر ایک خطرناک گڑھا موجود ہے۔",
            description="There is a dangerous pothole in the road.",
            suggested_category="Damaged Roads & Potholes",
        )

    with pytest.raises(ValidationError):
        GeneratedComplaint(
            transcription_text="سڑک پر ایک خطرناک گڑھا موجود ہے۔",
            description="سڑک پر ایک خطرناک گڑھا موجود ہے۔",
            suggested_category="Other",  # type: ignore[arg-type]
        )


def test_voice_route_accepts_pashto_selection() -> None:
    service = AsyncMock(spec=GroqVoiceComplaintService)
    service.create_draft.return_value = VoiceComplaintDraft(
        language="ps",
        transcription="زموږ په کوڅه کې د اوبو پایپ لیک دی.",
        description="زموږ په کوڅه کې د عامه اوبو پایپ لیک دی.",
        suggested_category="Water & Civic Sanitation",
    )
    app.dependency_overrides[require_citizen] = citizen
    app.dependency_overrides[get_voice_service] = lambda: service

    try:
        response = TestClient(app).post(
            "/api/voice-complaints/draft",
            data={"language": "ps"},
            files={"audio": ("complaint.webm", b"audio", "audio/webm")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["language"] == "ps"
    service.create_draft.assert_awaited_once_with(
        language="ps", content_type="audio/webm", content=b"audio"
    )


def test_voice_route_rejects_unsupported_language() -> None:
    service = AsyncMock(spec=GroqVoiceComplaintService)
    app.dependency_overrides[require_citizen] = citizen
    app.dependency_overrides[get_voice_service] = lambda: service

    try:
        response = TestClient(app).post(
            "/api/voice-complaints/draft",
            data={"language": "de"},
            files={"audio": ("complaint.webm", b"audio", "audio/webm")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    service.create_draft.assert_not_awaited()


def test_pashto_failure_returns_manual_typing_fallback() -> None:
    service = AsyncMock(spec=GroqVoiceComplaintService)
    service.create_draft.side_effect = VoiceComplaintError(
        "Pashto transcription is unavailable"
    )
    app.dependency_overrides[require_citizen] = citizen
    app.dependency_overrides[get_voice_service] = lambda: service

    try:
        response = TestClient(app).post(
            "/api/voice-complaints/draft",
            data={"language": "ps"},
            files={"audio": ("complaint.webm", b"audio", "audio/webm")},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 502
    assert response.json() == {
        "detail": (
            "Unable to process the Pashto recording. "
            "Please try again or type the complaint manually."
        )
    }


@pytest.mark.anyio
async def test_groq_pashto_rejection_never_falls_back_to_urdu(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_languages: list[str] = []

    class RejectingResponse:
        def raise_for_status(self) -> None:
            request = httpx.Request("POST", "https://api.groq.com/openai/v1/audio/transcriptions")
            response = httpx.Response(400, request=request)
            raise httpx.HTTPStatusError("unsupported", request=request, response=response)

        def json(self) -> dict[str, str]:
            return {}

    class FakeAsyncClient:
        def __init__(self, **_: object) -> None:
            return None

        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def post(self, *_: object, **kwargs: object) -> RejectingResponse:
            captured_languages.append(kwargs["data"]["language"])  # type: ignore[index]
            return RejectingResponse()

    monkeypatch.setattr("app.services.voice.httpx.AsyncClient", FakeAsyncClient)
    service = GroqVoiceComplaintService(Settings(groq_api_key="test-groq"))

    with pytest.raises(VoiceComplaintError, match="Pashto transcription is unavailable"):
        await service.create_draft(
            language="ps", content_type="audio/webm", content=b"fake-audio"
        )

    assert captured_languages == ["ps"]
