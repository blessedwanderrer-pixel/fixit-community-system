from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings
from app.core.security import CurrentUser, require_admin, require_citizen
from app.models.community import AdminAnalytics, Notification, UpcomingWork
from app.services.community import CommunityService

router = APIRouter(prefix="/api", tags=["analytics, upcoming work, and notifications"])


def get_community_service(settings: Settings = Depends(get_settings)) -> CommunityService:
    return CommunityService(settings)


@router.get("/admin/analytics", response_model=AdminAnalytics)
async def admin_analytics(
    currency: str = Query(min_length=3, max_length=3),
    admin: CurrentUser = Depends(require_admin),
    service: CommunityService = Depends(get_community_service),
) -> AdminAnalytics:
    if not currency.isalpha():
        raise HTTPException(status_code=422, detail="currency must be a three-letter code")
    return await service.admin_analytics(admin, currency)


@router.get("/upcoming-work", response_model=list[UpcomingWork])
async def upcoming_work(
    service: CommunityService = Depends(get_community_service),
) -> list[UpcomingWork]:
    return await service.upcoming_work(datetime.now(UTC))


@router.get("/notifications", response_model=list[Notification])
async def list_notifications(
    citizen: CurrentUser = Depends(require_citizen),
    service: CommunityService = Depends(get_community_service),
) -> list[Notification]:
    return await service.list_notifications(citizen)


@router.post("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_read(
    notification_id: UUID,
    citizen: CurrentUser = Depends(require_citizen),
    service: CommunityService = Depends(get_community_service),
) -> Notification:
    return await service.mark_notification_read(notification_id, citizen, datetime.now(UTC))
