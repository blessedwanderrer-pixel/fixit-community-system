"""Live verification for sanitized media, finance workflows, transparency, and RLS."""

from __future__ import annotations

import hashlib
import os
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from io import BytesIO
from typing import Any
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import BACKEND_DIR, get_settings
from app.main import app


@dataclass
class Results:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    def check(self, name: str, condition: bool, detail: str = "") -> bool:
        if condition:
            self.passed.append(name)
            print(f"PASS {name}")
            return True
        self.failed.append(name)
        suffix = f" ({detail})" if detail else ""
        print(f"FAIL {name}{suffix}")
        return False


def safe_detail(response: Any) -> str:
    try:
        body = response.json()
    except (ValueError, AttributeError):
        return f"HTTP {response.status_code}"
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("message") or body.get("error_code")
        if detail:
            return f"HTTP {response.status_code}: {detail}"
    return f"HTTP {response.status_code}"


def gps_jpeg() -> bytes:
    output = BytesIO()
    image = Image.new("RGB", (32, 24), "navy")
    exif = Image.Exif()
    exif[0x010E] = "FixIt live private metadata"
    exif[0x8825] = {
        1: "N", 2: (31.0, 31.0, 13.0),
        3: "E", 4: (74.0, 21.0, 31.0),
    }
    image.save(output, "JPEG", quality=92, exif=exif)
    return output.getvalue()


def plain_png(color: str) -> bytes:
    output = BytesIO()
    Image.new("RGB", (24, 24), color).save(output, "PNG")
    return output.getvalue()


def total(rows: list[dict[str, Any]], wanted_status: str) -> Decimal:
    return sum(
        (Decimal(str(row["amount"])) for row in rows if row.get("status") == wanted_status),
        Decimal("0"),
    )


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=True)
    get_settings.cache_clear()
    settings = get_settings()
    results = Results()

    passwords = {
        "citizen": os.getenv("FIXIT_TEST_CITIZEN_PASSWORD"),
        "admin": os.getenv("FIXIT_TEST_ADMIN_PASSWORD"),
        "coordinator": os.getenv("FIXIT_TEST_COORDINATOR_PASSWORD"),
    }
    if not all(passwords.values()):
        print("FAIL configuration: test account password variable missing")
        return 1
    if not all((settings.supabase_url, settings.supabase_publishable_key, settings.supabase_secret_key)):
        print("FAIL configuration: Supabase backend configuration missing")
        return 1

    base_url = settings.supabase_url.rstrip("/")
    emails = {role: f"{role}@fixit.test" for role in passwords}
    service_headers = {"apikey": settings.supabase_secret_key}
    if settings.supabase_secret_key.startswith("eyJ"):
        service_headers["Authorization"] = f"Bearer {settings.supabase_secret_key}"
    tokens: dict[str, str] = {}
    user_ids: dict[str, str] = {}
    run_id = uuid4().hex[:12]
    original = gps_jpeg()
    evidence = {"before": plain_png("orange"), "after": plain_png("green")}
    api = TestClient(app)

    with httpx.Client(timeout=settings.supabase_request_timeout_seconds) as live:
        for role in ("citizen", "admin", "coordinator"):
            response = live.post(
                f"{base_url}/auth/v1/token",
                headers={"apikey": settings.supabase_publishable_key},
                params={"grant_type": "password"},
                json={"email": emails[role], "password": passwords[role]},
            )
            ok = response.status_code == 200 and bool(response.json().get("access_token"))
            results.check(f"authenticate {role}", ok, safe_detail(response))
            if not ok:
                return 1
            tokens[role] = response.json()["access_token"]
            me = api.get("/api/me", headers={"Authorization": f"Bearer {tokens[role]}"})
            ok = me.status_code == 200 and me.json().get("role") == role
            results.check(f"load {role} profile", ok, safe_detail(me))
            if not ok:
                return 1
            user_ids[role] = me.json()["id"]

        def auth(role: str) -> dict[str, str]:
            return {"Authorization": f"Bearer {tokens[role]}"}

        def user_headers(role: str) -> dict[str, str]:
            return {
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {tokens[role]}",
            }

        def db_rows(table: str, params: dict[str, str]) -> list[dict[str, Any]]:
            response = live.get(
                f"{base_url}/rest/v1/{table}", headers=service_headers, params=params
            )
            if response.status_code != 200 or not isinstance(response.json(), list):
                raise RuntimeError(f"database read failed safely: {safe_detail(response)}")
            return response.json()

        # MEDIA: citizen upload through backend with real EXIF/GPS source.
        report_response = api.post(
            "/api/reports/with-photo", headers=auth("citizen"),
            data={
                "description": f"Live sanitized media verification {run_id}",
                "category": f"Media-Live-{run_id}",
                "latitude": "31.5204", "longitude": "74.3587",
            },
            files={"photo": ("source-with-gps.jpg", original, "image/jpeg")},
        )
        report = report_response.json() if report_response.status_code == 201 else {}
        report_id = report.get("id")
        results.check(
            "Citizen uploads real problem image through backend",
            report_response.status_code == 201 and bool(report_id), safe_detail(report_response),
        )
        if not report_id:
            print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
            return 1

        media_rows = db_rows("report_media", {
            "select": "id,storage_bucket,storage_object_path,stage",
            "report_id": f"eq.{report_id}", "stage": "eq.report",
        })
        media_path = media_rows[0]["storage_object_path"] if len(media_rows) == 1 else ""
        stored_response = live.get(
            f"{base_url}/storage/v1/object/authenticated/report-media/{media_path}",
            headers=service_headers,
        )
        stored = stored_response.content if stored_response.status_code == 200 else b""
        results.check(
            "Sanitized problem image persisted in private report-media bucket",
            len(media_rows) == 1 and stored_response.status_code == 200 and bool(stored),
            safe_detail(stored_response),
        )
        try:
            stored_image = Image.open(BytesIO(stored))
            stored_exif = stored_image.getexif()
            stored_metadata_removed = not stored_exif and "exif" not in stored_image.info
        except Exception:
            stored_metadata_removed = False
        results.check("Stored image has no EXIF/GPS metadata", stored_metadata_removed)
        results.check("Original unsanitized bytes were not stored", stored != original)
        print(f"MEDIA_ORIGINAL_BYTES {len(original)}")
        print(f"MEDIA_STORED_BYTES {len(stored)}")
        print(f"MEDIA_ORIGINAL_SHA256_PREFIX {hashlib.sha256(original).hexdigest()[:16]}")
        print(f"MEDIA_STORED_SHA256_PREFIX {hashlib.sha256(stored).hexdigest()[:16]}")

        anonymous_media = live.get(
            f"{base_url}/storage/v1/object/authenticated/report-media/{media_path}",
            headers={"apikey": settings.supabase_publishable_key},
        )
        coordinator_media = live.get(
            f"{base_url}/storage/v1/object/authenticated/report-media/{media_path}",
            headers=user_headers("coordinator"),
        )
        results.check(
            "Anonymous Storage access to private problem image is blocked",
            anonymous_media.status_code in {400, 401, 403, 404}, safe_detail(anonymous_media),
        )
        results.check(
            "Unassigned Coordinator Storage access to private problem image is blocked",
            coordinator_media.status_code in {400, 401, 403, 404}, safe_detail(coordinator_media),
        )

        approve = api.post(
            f"/api/admin/reports/{report_id}/decision", headers=auth("admin"),
            json={"status": "Approved"},
        )
        schedule = api.post(
            f"/api/coordinator/reports/{report_id}/schedule", headers=auth("coordinator"),
            json={"scheduled_for": (datetime.now(UTC) + timedelta(minutes=1)).isoformat()},
        )
        progress = api.post(
            f"/api/coordinator/reports/{report_id}/status", headers=auth("coordinator"),
            json={"status": "In Progress"},
        )
        results.check(
            "Report prepared with assigned Coordinator work record",
            approve.status_code == schedule.status_code == progress.status_code == 200,
        )

        # RLS permits the assigned coordinator to add media rows, but the DB
        # Solved trigger must still demand matching real Storage objects.
        fake_insert = live.post(
            f"{base_url}/rest/v1/report_media",
            headers={**user_headers("coordinator"), "Content-Type": "application/json", "Prefer": "return=representation"},
            json=[
                {"report_id": report_id, "uploaded_by": user_ids["coordinator"], "stage": "before", "storage_object_path": f"{report_id}/fake-before-{run_id}.jpg"},
                {"report_id": report_id, "uploaded_by": user_ids["coordinator"], "stage": "after", "storage_object_path": f"{report_id}/fake-after-{run_id}.jpg"},
            ],
        )
        fake_solve = api.post(
            f"/api/coordinator/reports/{report_id}/status", headers=auth("coordinator"),
            json={"status": "Solved"},
        )
        results.check(
            "Arbitrary media references cannot satisfy Solved requirement",
            fake_insert.status_code == 201 and fake_solve.status_code == 409
            and fake_solve.json().get("detail") == "MISSING_BEFORE_AFTER_EVIDENCE",
            safe_detail(fake_solve),
        )

        uploaded_evidence_paths: list[str] = []
        for stage in ("before", "after"):
            response = api.post(
                f"/api/coordinator/reports/{report_id}/evidence/upload",
                headers=auth("coordinator"), data={"stage": stage},
                files={"photo": (f"{stage}.png", evidence[stage], "image/png")},
            )
            body = response.json() if response.status_code == 200 else {}
            if body.get("storage_object_path"):
                uploaded_evidence_paths.append(body["storage_object_path"])
            results.check(f"Coordinator uploads real {stage} evidence", response.status_code == 200, safe_detail(response))
        solve = api.post(
            f"/api/coordinator/reports/{report_id}/status", headers=auth("coordinator"),
            json={"status": "Solved"},
        )
        results.check("Real Before and After Storage evidence permits Solved", solve.status_code == 200 and solve.json().get("status") == "Solved", safe_detail(solve))

        # DONATIONS.
        donation_amount = Decimal("123.45")
        transaction_id = f"LIVE-{run_id}-VERIFIED"
        donation_form = {
            "transaction_id": transaction_id, "amount": str(donation_amount),
            "currency": "PKR", "transaction_at": datetime.now(UTC).isoformat(),
        }
        donation = api.post(
            "/api/donations", headers=auth("citizen"), data=donation_form,
            files={"screenshot": ("payment.png", plain_png("blue"), "image/png")},
        )
        donation_body = donation.json() if donation.status_code == 201 else {}
        donation_id = donation_body.get("id")
        results.check("Citizen submits real donation proof as Pending", donation.status_code == 201 and donation_body.get("status") == "Pending", safe_detail(donation))
        if not donation_id:
            return 1
        donation_rows = db_rows("donations", {"select": "screenshot_storage_object_path", "id": f"eq.{donation_id}"})
        proof_path = donation_rows[0]["screenshot_storage_object_path"]
        anonymous_proof = live.get(
            f"{base_url}/storage/v1/object/authenticated/donation-proofs/{proof_path}",
            headers={"apikey": settings.supabase_publishable_key},
        )
        coordinator_donation = live.get(
            f"{base_url}/rest/v1/donations", headers=user_headers("coordinator"),
            params={"select": "id", "id": f"eq.{donation_id}"},
        )
        results.check("Donation screenshot is private", anonymous_proof.status_code in {400, 401, 403, 404}, safe_detail(anonymous_proof))
        results.check("Donation RLS hides donor record from Coordinator", coordinator_donation.status_code == 200 and coordinator_donation.json() == [], safe_detail(coordinator_donation))

        duplicate = api.post(
            "/api/donations", headers=auth("citizen"), data=donation_form,
            files={"screenshot": ("duplicate.png", plain_png("purple"), "image/png")},
        )
        results.check("Duplicate transaction_id is rejected", duplicate.status_code == 409, safe_detail(duplicate))
        for role in ("citizen", "coordinator"):
            denied = api.post(
                f"/api/admin/donations/{donation_id}/review", headers=auth(role),
                json={"status": "Verified"},
            )
            results.check(f"{role.capitalize()} cannot verify donation", denied.status_code == 403, safe_detail(denied))
        admin_proof = api.get(f"/api/admin/donations/{donation_id}/proof", headers=auth("admin"))
        results.check("Admin retrieves private donation proof", admin_proof.status_code == 200 and bool(admin_proof.content), safe_detail(admin_proof))
        verified = api.post(
            f"/api/admin/donations/{donation_id}/review", headers=auth("admin"),
            json={"status": "Verified"},
        )
        verified_body = verified.json() if verified.status_code == 200 else {}
        results.check(
            "Admin manually verifies donation with audit fields",
            verified.status_code == 200 and verified_body.get("status") == "Verified"
            and verified_body.get("verified_by") == user_ids["admin"]
            and bool(verified_body.get("verified_at")), safe_detail(verified),
        )
        persisted_verified = db_rows("donations", {"select": "status,verified_by,verified_at", "id": f"eq.{donation_id}"})
        results.check(
            "Verified donation review persisted",
            len(persisted_verified) == 1 and persisted_verified[0].get("status") == "Verified"
            and persisted_verified[0].get("verified_by") == user_ids["admin"]
            and bool(persisted_verified[0].get("verified_at")),
        )

        async_status_ids: dict[str, str] = {}
        for label, decision, amount in (("rejected", "Rejected", "98.76"), ("pending", None, "11.11")):
            response = api.post(
                "/api/donations", headers=auth("citizen"),
                data={"transaction_id": f"LIVE-{run_id}-{label.upper()}", "amount": amount,
                      "currency": "PKR", "transaction_at": datetime.now(UTC).isoformat()},
                files={"screenshot": (f"{label}.png", plain_png("gray"), "image/png")},
            )
            if response.status_code == 201:
                async_status_ids[label] = response.json()["id"]
            if decision and response.status_code == 201:
                response = api.post(
                    f"/api/admin/donations/{response.json()['id']}/review", headers=auth("admin"),
                    json={"status": decision},
                )
            results.check(f"Real {label} donation state created", response.status_code in {200, 201} and response.json().get("status") == (decision or "Pending"), safe_detail(response))

        # EXPENSES use the assigned work record created above.
        expense_amount = Decimal("67.89")
        def submit_expense(label: str, amount: str) -> Any:
            return api.post(
                "/api/coordinator/expenses", headers=auth("coordinator"),
                data={"report_id": report_id, "amount": amount, "currency": "PKR", "description": f"Live {label} expense {run_id}"},
                files={"receipt": (f"{label}.png", plain_png("white"), "image/png")},
            )

        expense = submit_expense("approved", str(expense_amount))
        expense_body = expense.json() if expense.status_code == 201 else {}
        expense_id = expense_body.get("id")
        results.check("Assigned Coordinator submits real receipt as Pending", expense.status_code == 201 and expense_body.get("status") == "Pending", safe_detail(expense))
        if not expense_id:
            return 1
        expense_rows = db_rows("expenses", {"select": "receipt_storage_object_path", "id": f"eq.{expense_id}"})
        receipt_path = expense_rows[0]["receipt_storage_object_path"]
        anonymous_receipt = live.get(
            f"{base_url}/storage/v1/object/authenticated/expense-receipts/{receipt_path}",
            headers={"apikey": settings.supabase_publishable_key},
        )
        results.check("Expense receipt is private", anonymous_receipt.status_code in {400, 401, 403, 404}, safe_detail(anonymous_receipt))
        coordinator_approve = api.post(
            f"/api/admin/expenses/{expense_id}/review", headers=auth("coordinator"),
            json={"status": "Approved"},
        )
        results.check("Coordinator cannot approve expense", coordinator_approve.status_code == 403, safe_detail(coordinator_approve))
        admin_receipt = api.get(f"/api/admin/expenses/{expense_id}/receipt", headers=auth("admin"))
        results.check("Admin retrieves private expense receipt", admin_receipt.status_code == 200 and bool(admin_receipt.content), safe_detail(admin_receipt))
        approved_expense = api.post(
            f"/api/admin/expenses/{expense_id}/review", headers=auth("admin"),
            json={"status": "Approved"},
        )
        approved_body = approved_expense.json() if approved_expense.status_code == 200 else {}
        results.check(
            "Admin approves expense with audit fields",
            approved_expense.status_code == 200 and approved_body.get("status") == "Approved"
            and approved_body.get("approved_by") == user_ids["admin"]
            and bool(approved_body.get("approved_at")), safe_detail(approved_expense),
        )
        persisted_approved = db_rows("expenses", {"select": "status,approved_by,approved_at", "id": f"eq.{expense_id}"})
        results.check(
            "Approved expense review persisted",
            len(persisted_approved) == 1 and persisted_approved[0].get("status") == "Approved"
            and persisted_approved[0].get("approved_by") == user_ids["admin"]
            and bool(persisted_approved[0].get("approved_at")),
        )

        for label, decision, amount in (("rejected", "Rejected", "43.21"), ("pending", None, "12.34")):
            response = submit_expense(label, amount)
            if decision and response.status_code == 201:
                response = api.post(
                    f"/api/admin/expenses/{response.json()['id']}/review", headers=auth("admin"),
                    json={"status": decision},
                )
            results.check(f"Real {label} expense state created", response.status_code in {200, 201} and response.json().get("status") == (decision or "Pending"), safe_detail(response))

        # TRANSPARENCY: compare backend output to fresh real DB aggregates.
        all_donations = db_rows("donations", {"select": "amount,status", "currency": "eq.PKR"})
        all_expenses = db_rows("expenses", {"select": "amount,status", "currency": "eq.PKR"})
        expected_donations = total(all_donations, "Verified")
        expected_expenses = total(all_expenses, "Approved")
        transparency = api.get("/api/transparency?currency=PKR")
        public_body = transparency.json() if transparency.status_code == 200 else {}
        actual_donations = Decimal(str(public_body.get("verified_donations_total", "-1")))
        actual_expenses = Decimal(str(public_body.get("approved_spending_total", "-1")))
        results.check(
            "Transparency Verified donation total matches real DB aggregate",
            transparency.status_code == 200 and actual_donations == expected_donations,
            safe_detail(transparency),
        )
        results.check(
            "Transparency Approved spending total matches real DB aggregate",
            transparency.status_code == 200 and actual_expenses == expected_expenses,
            safe_detail(transparency),
        )
        results.check(
            "Pending and Rejected financial records are excluded",
            any(r["status"] == "Pending" for r in all_donations)
            and any(r["status"] == "Rejected" for r in all_donations)
            and any(r["status"] == "Pending" for r in all_expenses)
            and any(r["status"] == "Rejected" for r in all_expenses)
            and actual_donations == expected_donations and actual_expenses == expected_expenses,
        )
        forbidden_public_keys = {
            "donor_id", "submitted_by", "verified_by", "verified_at", "approved_by", "approved_at",
            "screenshot_storage_object_path", "receipt_storage_object_path", "created_by", "latitude", "longitude",
        }
        results.check(
            "Transparency response exposes no private or internal fields",
            not forbidden_public_keys.intersection(public_body.keys())
            and all(not forbidden_public_keys.intersection(item.keys()) for item in public_body.get("completed_work", [])),
        )
        print(f"TRANSPARENCY_EXPECTED_VERIFIED_DONATIONS_PKR {expected_donations:.2f}")
        print(f"TRANSPARENCY_ACTUAL_VERIFIED_DONATIONS_PKR {actual_donations:.2f}")
        print(f"TRANSPARENCY_EXPECTED_APPROVED_SPENDING_PKR {expected_expenses:.2f}")
        print(f"TRANSPARENCY_ACTUAL_APPROVED_SPENDING_PKR {actual_expenses:.2f}")
        print(f"SUMMARY passed={len(results.passed)} failed={len(results.failed)}")
        return 1 if results.failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"FAIL live integration aborted safely: {exc}")
        sys.exit(1)
