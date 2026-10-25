"""Production-safe public signup audit with an isolated user and guaranteed cleanup."""

from __future__ import annotations

from uuid import uuid4

import httpx

from app.core.config import get_settings


def main() -> int:
    settings = get_settings()
    if not all((settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key)):
        print("BLOCKED missing Supabase audit configuration")
        return 2

    base_url = settings.supabase_url.rstrip("/")
    email = f"fixit-signup-audit-{uuid4().hex}@example.com"
    password = f"FixIt!Audit{uuid4().hex}Aa1"
    publishable_headers = {"apikey": settings.supabase_publishable_key}
    service_headers = {"apikey": settings.supabase_secret_key}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"

    user_id: str | None = None
    failures: list[str] = []
    checks = 0

    def check(label: str, passed: bool, detail: str = "") -> None:
        nonlocal checks
        checks += 1
        print(f"{'PASS' if passed else 'FAIL'} {label}" + (f" ({detail})" if detail and not passed else ""))
        if not passed:
            failures.append(label)

    with httpx.Client(timeout=45) as client:
        try:
            signup = client.post(
                f"{base_url}/auth/v1/signup",
                headers=publishable_headers,
                params={"redirect_to": "https://fixit-community-web.vercel.app/login?email-confirmed=true"},
                json={
                    "email": email,
                    "password": password,
                    # Deliberately attempt escalation. The database must ignore it.
                    "data": {"full_name": "FixIt Signup Audit", "role": "admin"},
                    "gotrue_meta_security": {},
                    "code_challenge": None,
                },
            )
            body = signup.json() if signup.headers.get("content-type", "").startswith("application/json") else {}
            user_id = body.get("user", {}).get("id") or body.get("id")
            check("public email/password signup accepted", signup.status_code == 200, str(body.get("msg") or body.get("message") or signup.status_code))
            if signup.status_code != 200 or not user_id:
                print(f"SUMMARY passed={checks - len(failures)} failed={len(failures)} total={checks}")
                return 1

            profiles = client.get(
                f"{base_url}/rest/v1/profiles",
                headers=service_headers,
                params={"select": "id,role", "id": f"eq.{user_id}"},
            )
            rows = profiles.json() if profiles.status_code == 200 else []
            check("profile trigger created exactly one row", len(rows) == 1, f"status={profiles.status_code} rows={len(rows)}")
            check("attempted Admin role escalation ignored", len(rows) == 1 and rows[0].get("role") == "citizen")

            duplicate = client.post(
                f"{base_url}/auth/v1/signup",
                headers=publishable_headers,
                params={"redirect_to": "https://fixit-community-web.vercel.app/login?email-confirmed=true"},
                json={"email": email, "password": password, "data": {"full_name": "Duplicate Attempt"}},
            )
            check("duplicate signup handled safely", duplicate.status_code in (200, 400, 422, 429), str(duplicate.status_code))
            profiles_after = client.get(
                f"{base_url}/rest/v1/profiles",
                headers=service_headers,
                params={"select": "id,role", "id": f"eq.{user_id}"},
            )
            duplicate_rows = profiles_after.json() if profiles_after.status_code == 200 else []
            check("duplicate signup did not duplicate profile", len(duplicate_rows) == 1)

            session = body.get("access_token") or body.get("session", {}).get("access_token")
            if session:
                login = client.post(
                    f"{base_url}/auth/v1/token",
                    headers=publishable_headers,
                    params={"grant_type": "password"},
                    json={"email": email, "password": password},
                )
                check("new Citizen can log in immediately", login.status_code == 200, str(login.status_code))
            else:
                print("INFO email confirmation is enabled; login requires the confirmation email")
        finally:
            if user_id:
                deleted = client.delete(f"{base_url}/auth/v1/admin/users/{user_id}", headers=service_headers)
                check("temporary audit user removed", deleted.status_code in (200, 204), str(deleted.status_code))
                remaining = client.get(
                    f"{base_url}/rest/v1/profiles",
                    headers=service_headers,
                    params={"select": "id", "id": f"eq.{user_id}"},
                )
                check("temporary profile removed by cascade", remaining.status_code == 200 and remaining.json() == [])

    print(f"SUMMARY passed={checks - len(failures)} failed={len(failures)} total={checks}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
