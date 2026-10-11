from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


FixItCategory = Literal[
    "Damaged Roads & Potholes",
    "Water & Civic Sanitation",
    "Waste & Community Cleanliness",
    "Community Infrastructure Hazards",
]
VoiceLanguage = Literal["ur", "ps"]


class VoiceComplaintDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: VoiceLanguage
    transcription: str = Field(min_length=1, max_length=4000)
    description: str = Field(min_length=10, max_length=2000)
    suggested_category: FixItCategory

    @field_validator("description")
    @classmethod
    def description_must_use_supported_script(cls, value: str) -> str:
        if not any("\u0600" <= character <= "\u06ff" for character in value):
            raise ValueError("generated complaint must use Urdu or Pashto script")
        return value


class GeneratedComplaint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcription_text: str = Field(min_length=1, max_length=4000)
    description: str = Field(min_length=10, max_length=2000)
    suggested_category: FixItCategory

    @field_validator("transcription_text", "description")
    @classmethod
    def text_must_include_urdu(cls, value: str) -> str:
        if not any("\u0600" <= character <= "\u06ff" for character in value):
            raise ValueError("generated text must use Urdu or Pashto script")
        return value
