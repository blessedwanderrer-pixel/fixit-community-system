"""Read-only live checks for the configured Supabase project."""

from __future__ import annotations

import sys

import httpx

from app.core.config import get_settings

REQUIRED_TABLES = {
    "profiles": "id",
    "problem_reports": "id",
    "report_reporters": "report_id",
    "ai_triage_results": "id",
    "work_records": "id",
    "report_media": "id",
    "donations": "id",
    "expenses": "id",
    "notifications": "id",
    "audit_events": "id",
}
REQUIRED_BUCKETS = {"report-media", "expense-receipts"}


def main() -> int:
    settings = get_settings()
    if not settings.supabase_url:
        print("FAIL configuration: SUPABASE_URL is missing")
        return 1
    if not settings.supabase_publishable_key:
        print("FAIL configuration: SUPABASE_PUBLISHABLE_KEY is missing")
        return 1
    if not settings.supabase_secret_key:
        print("FAIL configuration: SUPABASE_SECRET_KEY is missing")
        return 1

    base_url = settings.supabase_url.rstrip("/")
    service_headers = {
        "apikey": settings.supabase_secret_key,
        "User-Agent": "FixIt-backend-verifier/1.0",
    }
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"

    failed = False
    with httpx.Client(timeout=settings.supabase_request_timeout_seconds) as client:
        auth_response = client.get(
            f"{base_url}/auth/v1/settings",
            headers={"apikey": settings.supabase_publishable_key},
        )
        auth_ok = auth_response.status_code == 200
        failed |= not auth_ok
        print(f"{'PASS' if auth_ok else 'FAIL'} auth service: HTTP {auth_response.status_code}")

        for table, identity_column in REQUIRED_TABLES.items():
            response = client.get(
                f"{base_url}/rest/v1/{table}",
                headers=service_headers,
                params={"select": identity_column, "limit": "0"},
            )
            ok = response.status_code in {200, 206}
            failed |= not ok
            print(f"{'PASS' if ok else 'FAIL'} table {table}: HTTP {response.status_code}")

        bucket_response = client.get(f"{base_url}/storage/v1/bucket", headers=service_headers)
        bucket_ids: set[str] = set()
        if bucket_response.status_code == 200:
            payload = bucket_response.json()
            if isinstance(payload, list):
                bucket_ids = {
                    item["id"]
                    for item in payload
                    if isinstance(item, dict) and isinstance(item.get("id"), str)
                }

        for bucket in sorted(REQUIRED_BUCKETS):
            ok = bucket_response.status_code == 200 and bucket in bucket_ids
            failed |= not ok
            print(
                f"{'PASS' if ok else 'FAIL'} bucket {bucket}: "
                f"HTTP {bucket_response.status_code}"
            )

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
