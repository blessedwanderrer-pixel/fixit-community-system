from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.core.security import CurrentUser, require_citizen
from app.models.voice import VoiceComplaintDraft, VoiceLanguage
from app.services.voice import (
    VOICE_MAX_UPLOAD_BYTES,
    GroqVoiceComplaintService,
    VoiceComplaintError,
)


router = APIRouter(prefix="/api", tags=["voice complaint assistant"])


def get_voice_service(
    settings: Settings = Depends(get_settings),
) -> GroqVoiceComplaintService:
    return GroqVoiceComplaintService(settings)


@router.post("/voice-complaints/draft", response_model=VoiceComplaintDraft)
async def create_voice_complaint_draft(
    audio: UploadFile = File(),
    language: VoiceLanguage = Form(default="ur"),
    _citizen: CurrentUser = Depends(require_citizen),
    service: GroqVoiceComplaintService = Depends(get_voice_service),
) -> VoiceComplaintDraft:
    content = await audio.read(VOICE_MAX_UPLOAD_BYTES + 1)
    try:
        return await service.create_draft(
            language=language,
            content_type=audio.content_type,
            content=content,
        )
    except VoiceComplaintError as exc:
        detail = str(exc)
        if detail in {
            "Unsupported audio format",
            "The recording is empty",
            "The recording is too large",
        }:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
        if detail == "Voice assistance is not configured":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail) from exc
        language_name = "Pashto" if language == "ps" else "Urdu"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"Unable to process the {language_name} recording. "
                "Please try again or type the complaint manually."
            ),
        ) from exc
