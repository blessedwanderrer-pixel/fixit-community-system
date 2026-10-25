from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

FIXIT_PRODUCTION_FRONTEND_ORIGINS = (
    "https://fixit-community-web.vercel.app",
    "https://fixit-community-web-hassaans-team.vercel.app",
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FixIt Community API"
    app_environment: str = "development"
    debug: bool = False

    # Optional until a feature actually connects to Supabase.
    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    supabase_secret_key: str | None = None
    supabase_request_timeout_seconds: float = 10.0
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    media_max_upload_bytes: int = 8 * 1024 * 1024
    media_max_pixels: int = 25_000_000

    # Scheduled coordinator email reminders. These values are backend-only.
    cron_secret: str | None = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465
    smtp_username: str = "blessedwanderrer@gmail.com"
    smtp_from_email: str = "blessedwanderrer@gmail.com"
    google_app_password: str | None = None
    public_frontend_url: str = "https://fixit-community-web.vercel.app"

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        configured_origins = (
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        )
        return list(dict.fromkeys((*configured_origins, *FIXIT_PRODUCTION_FRONTEND_ORIGINS)))


@lru_cache
def get_settings() -> Settings:
    return Settings()
