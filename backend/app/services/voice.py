import json
import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.models.voice import GeneratedComplaint, VoiceComplaintDraft, VoiceLanguage


VOICE_MAX_UPLOAD_BYTES = 4 * 1024 * 1024
VOICE_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo"
ALLOWED_AUDIO_TYPES = {
    "audio/flac": ".flac",
    "audio/m4a": ".m4a",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "video/mp4": ".mp4",
}
LANGUAGE_CONFIG = {
    "ur": {
        "name": "Urdu",
        "filename": "urdu-complaint",
        "transcription_prompt": "یہ پاکستان میں شہری مسئلے کی اردو شکایت ہے۔ عام انگریزی الفاظ کو درست رکھیں۔",
        "generation_instruction": (
            "Write in clear, natural Urdu script. Return a faithful Urdu-script transcription; "
            "transliterate spoken Roman Urdu into Urdu script without summarizing it."
        ),
    },
    "ps": {
        "name": "Pashto",
        "filename": "pashto-complaint",
        "transcription_prompt": "دا په پاکستان کې د یوې ولسي ستونزې پښتو شکایت دی. عام انګلیسي ټکي سم وساتئ.",
        "generation_instruction": (
            "Write in clear, natural Pashto script. Return a faithful Pashto-script "
            "transcription without summarizing or translating it into Urdu."
        ),
    },
}


class VoiceComplaintError(Exception):
    """A safe, expected failure while generating a voice-assisted draft."""


class GroqVoiceComplaintService:
    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.groq_api_key
        self.chat_model = settings.groq_model

    async def create_draft(
        self,
        *,
        language: VoiceLanguage,
        content_type: str | None,
        content: bytes,
    ) -> VoiceComplaintDraft:
        if not self.api_key:
            raise VoiceComplaintError("Voice assistance is not configured")

        normalized_type = (content_type or "").split(";", 1)[0].lower()
        extension = ALLOWED_AUDIO_TYPES.get(normalized_type)
        if extension is None:
            raise VoiceComplaintError("Unsupported audio format")
        if not content:
            raise VoiceComplaintError("The recording is empty")
        if len(content) > VOICE_MAX_UPLOAD_BYTES:
            raise VoiceComplaintError("The recording is too large")

        config = LANGUAGE_CONFIG[language]
        transcription = await self._transcribe(
            language=language,
            filename=f"{config['filename']}{extension}",
            content_type=normalized_type,
            content=content,
        )
        generated = await self._generate_complaint(transcription, language)
        return VoiceComplaintDraft(
            language=language,
            transcription=generated.transcription_text,
            description=generated.description,
            suggested_category=generated.suggested_category,
        )

    async def _transcribe(
        self,
        *,
        language: VoiceLanguage,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> str:
        config = LANGUAGE_CONFIG[language]
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"file": (filename, content, content_type)},
                    data={
                        "model": VOICE_TRANSCRIPTION_MODEL,
                        "language": language,
                        "response_format": "json",
                        "temperature": "0",
                        "prompt": config["transcription_prompt"],
                    },
                )
            response.raise_for_status()
            transcription = str(response.json()["text"]).strip()
            if not transcription:
                raise VoiceComplaintError("No speech was detected in the recording")
            return transcription[:4000]
        except VoiceComplaintError:
            raise
        except httpx.HTTPStatusError as exc:
            if language == "ps" and exc.response.status_code in {400, 422}:
                raise VoiceComplaintError("Pashto transcription is unavailable") from exc
            raise VoiceComplaintError(f"{config['name']} transcription failed") from exc
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            raise VoiceComplaintError(f"{config['name']} transcription failed") from exc

    async def _generate_complaint(
        self, transcription: str, language: VoiceLanguage
    ) -> GeneratedComplaint:
        config = LANGUAGE_CONFIG[language]
        schema = GeneratedComplaint.model_json_schema()
        payload = {
            "model": self.chat_model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You prepare editable citizen complaint drafts for FixIt Pakistan. "
                        f"{config['generation_instruction']} Preserve place names, measurements, "
                        "and commonly mixed English terms accurately. "
                        "Do not invent a location, severity, duration, evidence, or any fact not "
                        "present in the transcription. Choose exactly one supplied FixIt category. "
                        "This is a draft only and must never approve or submit a report."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Valid categories:\n"
                        "- Damaged Roads & Potholes\n"
                        "- Water & Civic Sanitation\n"
                        "- Waste & Community Cleanliness\n"
                        "- Community Infrastructure Hazards\n\n"
                        f"{config['name']} speech transcription:\n{transcription}\n\n"
                        f"Return the faithful {config['name']}-script transcription, a {config['name']} complaint "
                        "description, and the single best valid category."
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": f"fixit_{language}_voice_complaint",
                    "strict": True,
                    "schema": schema,
                },
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return GeneratedComplaint.model_validate(json.loads(content))
        except (
            httpx.HTTPError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValidationError,
        ) as exc:
            raise VoiceComplaintError("Complaint draft generation failed") from exc
