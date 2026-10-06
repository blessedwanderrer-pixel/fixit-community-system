from datetime import datetime
from enum import StrEnum
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import Settings, get_settings


class AppRole(StrEnum):
    CITIZEN = "citizen"
    ADMIN = "admin"
    COORDINATOR = "coordinator"


class CurrentUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: UUID
    email: str | None = None
    role: AppRole
    created_at: datetime
    updated_at: datetime
    access_token: str = Field(default="", exclude=True, repr=False)


bearer_scheme = HTTPBearer(auto_error=False)


def _authentication_error(detail: str = "Invalid or expired bearer token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _authentication_error("Bearer token required")

    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        )

    token = credentials.credentials
    base_url = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.supabase_request_timeout_seconds) as client:
            auth_response = await client.get(f"{base_url}/auth/v1/user", headers=headers)
            if auth_response.status_code != status.HTTP_200_OK:
                raise _authentication_error()

            auth_user = auth_response.json()
            user_id = auth_user.get("id")
            if not user_id:
                raise _authentication_error()

            profile_response = await client.get(
                f"{base_url}/rest/v1/profiles",
                headers={**headers, "Accept": "application/vnd.pgrst.object+json"},
                params={
                    "select": "id,role,created_at,updated_at",
                    "id": f"eq.{user_id}",
                },
            )
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication service unavailable",
        ) from exc

    if profile_response.status_code == status.HTTP_406_NOT_ACCEPTABLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user has no application profile",
        )
    if profile_response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load application profile",
        )

    try:
        profile = profile_response.json()
        if profile.get("id") != user_id:
            raise ValueError("Profile does not match authenticated user")
        return CurrentUser(email=auth_user.get("email"), access_token=token, **profile)
    except (AttributeError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Application profile is invalid",
        ) from exc


def require_roles(*allowed_roles: AppRole):
    allowed = frozenset(allowed_roles)

    async def role_guard(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return role_guard


require_admin = require_roles(AppRole.ADMIN)
require_citizen = require_roles(AppRole.CITIZEN)
require_coordinator = require_roles(AppRole.COORDINATOR)
