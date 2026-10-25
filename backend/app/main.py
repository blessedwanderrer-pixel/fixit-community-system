from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.reports import router as reports_router
from app.api.routes.finance import router as finance_router
from app.api.routes.community import router as community_router
from app.api.routes.voice import router as voice_router
from app.api.routes.reminders import router as reminders_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, debug=settings.debug)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(reports_router)
    application.include_router(finance_router)
    application.include_router(community_router)
    application.include_router(voice_router)
    application.include_router(reminders_router)

    return application


app = create_app()
