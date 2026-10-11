import json

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import Settings
from app.models.reports import ReportCreate


class AITriageResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    short_summary: str = Field(min_length=1, max_length=300)
    suggested_category: str = Field(min_length=1, max_length=100)
    priority: str = Field(min_length=1, max_length=50)
    community_private_scope: str = Field(pattern="^(community|private)$")
    recommendation: str = Field(min_length=1, max_length=500)
    reason: str = Field(min_length=1, max_length=1000)


class AITriageError(Exception):
    """Expected, non-fatal AI triage failure."""


class GroqTriageService:
    def __init__(self, settings: Settings) -> None:
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model

    async def analyze(self, report: ReportCreate) -> AITriageResult:
        if not self.api_key:
            raise AITriageError("Groq is not configured")

        schema = AITriageResult.model_json_schema()
        payload = {
            "model": self.model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the advisory triage agent for a community problem-reporting system. "
                        "Provide triage advice only. Never approve, reject, merge, or make a final "
                        "workflow decision. The recommendation is reviewed by an administrator. "
                        "Citizen descriptions may be written in English, Urdu, or Pashto; understand "
                        "the original language and return the same required structured schema."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Citizen category: {report.category}\n"
                        f"Description: {report.description}\n"
                        "Classify the report using the required response schema."
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "fixit_ai_triage",
                    "strict": True,
                    "schema": schema,
                },
            },
        }

        try:
            # Product requirement: do not impose an application-level timeout
            # on Groq triage. This is still a single request with no retry loop.
            async with httpx.AsyncClient(timeout=None) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return AITriageResult.model_validate(parsed)
        except (
            httpx.HTTPError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValidationError,
        ) as exc:
            raise AITriageError("Groq triage failed or returned invalid output") from exc
