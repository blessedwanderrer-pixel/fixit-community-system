from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core import security
from app.core.config import Settings
from app.core.security import AppRole, CurrentUser, get_current_user, require_admin
from app.main import app

USER_ID = "11111111-1111-4111-8111-111111111111"
NOW = "2026-10-04T00:00:00Z"


class FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        return self._payload


class FakeAsyncClient:
    def __init__(self, responses: list[FakeResponse], **_: object) -> None:
        self._responses = iter(responses)

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def get(self, *_: object, **__: object) -> FakeResponse:
        return next(self._responses)


def make_user(role: AppRole) -> CurrentUser:
    return CurrentUser(
        id=UUID(USER_ID),
        email="user@example.test",
        role=role,
        created_at=datetime(2026, 10, 4, tzinfo=UTC),
        updated_at=datetime(2026, 10, 4, tzinfo=UTC),
    )


def test_application_roles_are_exact() -> None:
    assert {role.value for role in AppRole} == {"citizen", "admin", "coordinator"}


def test_me_requires_bearer_token() -> None:
    response = TestClient(app).get("/api/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Bearer token required"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_token_rejected_by_supabase(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = FakeAsyncClient([FakeResponse(401, {"message": "invalid token"})])
    monkeypatch.setattr(security.httpx, "AsyncClient", lambda **kwargs: fake_client)
    app.dependency_overrides[security.get_settings] = lambda: Settings(
        supabase_url="https://project.example.test",
        supabase_publishable_key="test-publishable-key",
    )

    try:
        response = TestClient(app).get(
            "/api/me", headers={"Authorization": "Bearer rejected-token"}
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired bearer token"}


def test_me_returns_supabase_profile_role(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = FakeAsyncClient(
        [
            FakeResponse(200, {"id": USER_ID, "email": "user@example.test"}),
            FakeResponse(
                200,
                {
                    "id": USER_ID,
                    "role": "coordinator",
                    "created_at": NOW,
                    "updated_at": NOW,
                },
            ),
        ]
    )
    monkeypatch.setattr(security.httpx, "AsyncClient", lambda **kwargs: fake_client)
    app.dependency_overrides[security.get_settings] = lambda: Settings(
        supabase_url="https://project.example.test",
        supabase_publishable_key="test-publishable-key",
    )

    try:
        response = TestClient(app).get(
            "/api/me", headers={"Authorization": "Bearer accepted-token"}
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": USER_ID,
        "email": "user@example.test",
        "role": "coordinator",
        "created_at": NOW,
        "updated_at": NOW,
    }


@pytest.mark.parametrize("role", [AppRole.CITIZEN, AppRole.COORDINATOR])
def test_admin_guard_rejects_non_admin_roles(role: AppRole) -> None:
    guarded_app = FastAPI()

    @guarded_app.get("/admin-only")
    async def admin_only(_: CurrentUser = Depends(require_admin)) -> dict[str, bool]:
        return {"allowed": True}

    guarded_app.dependency_overrides[get_current_user] = lambda: make_user(role)
    response = TestClient(guarded_app).get("/admin-only")

    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions"}


def test_admin_guard_allows_admin() -> None:
    guarded_app = FastAPI()

    @guarded_app.get("/admin-only")
    async def admin_only(_: CurrentUser = Depends(require_admin)) -> dict[str, bool]:
        return {"allowed": True}

    guarded_app.dependency_overrides[get_current_user] = lambda: make_user(AppRole.ADMIN)
    response = TestClient(guarded_app).get("/admin-only")

    assert response.status_code == 200
    assert response.json() == {"allowed": True}
