# FixIt Community API

Backend foundation for the FixIt Community Problem & Donation Tracking System.

## Local setup

Requires Python 3.10 or newer.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

Run tests with:

```powershell
python -m pytest
```

## Configuration scope

Settings are read from environment variables and an optional local `.env` file.
Supabase values are optional so this foundation can start without credentials;
they must be supplied before a future Supabase integration is added. The
publishable key may eventually be used by a frontend, but the secret key must
remain backend-only.

Development CORS currently permits the conventional React development origins
on ports 3000 and 5173. Override `CORS_ORIGINS` with a comma-separated list when
the frontend origin is known.

No external providers have been selected yet. Add typed settings and matching
placeholder variables only when a provider and its requirements are confirmed.

## Supabase setup

The initial migration is in `supabase/migrations`. Apply it to a Supabase
project through the Supabase CLI or SQL migration workflow, then set
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the backend `.env` file.
`SUPABASE_SECRET_KEY` is reserved for future trusted backend operations and must
never be exposed to a frontend.

Bearer tokens sent to the backend are validated by Supabase Auth. The backend
then reads the matching `profiles` row with that same user token and treats its
database `role` as authoritative. New Auth users receive the `citizen` role;
administrators must promote users to `admin` or `coordinator` through a trusted
administrative process.

Storage objects use these private buckets and path conventions:

- `report-media/<report-uuid>/<unique-file-name>`
- `expense-receipts/<unique-file-name>`

The migration creates the buckets and their RLS policies. Uploads must go
through the Supabase Storage API, not direct writes to `storage.objects`.

Run the read-only connectivity and deployed-object check with:

```powershell
python -m scripts.verify_supabase
```

## Problem-report workflow

Apply `supabase/migrations/20261004010000_add_core_report_workflow.sql` before
using the report endpoints. It adds the report category and transaction-safe
database functions for creation, cancellation, review, scheduling, evidence,
and coordinator status changes.

The backend exposes citizen routes under `/api/reports`, administrator routes
under `/api/admin/reports`, and coordinator routes under
`/api/coordinator/reports`. An approved report is available to coordinators;
the coordinator who schedules it becomes its assigned coordinator for later
work and evidence updates.

## Duplicate detection and AI triage

Apply `supabase/migrations/20261004020000_add_duplicate_detection_and_ai_review.sql`
after the two earlier migrations. It enables PostGIS geography checks, stores
possible-duplicate candidates, and adds the Admin-only merge function.

Duplicate candidates require an exact category match, a PostGIS geodesic
distance of at most 100 meters, and an existing status of `Submitted`,
`Approved`, `Scheduled`, or `In Progress`. Detection never merges reports.
Citizens receive only the warning flag and candidate count; candidate report
details are available only from the Admin review endpoint.

Configure AI triage only in the backend environment:

```dotenv
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-20b
```

The triage response is validated against a strict schema and stored as advisory
data. It has no report-decision field and cannot approve, reject, or merge a
report. The Groq request has no application-level timeout and is attempted only
once. Network, API, malformed-output, or validation failures leave the already
submitted report intact.

Admin review routes:

- `GET /api/admin/reports/{report_id}/review`
- `POST /api/admin/reports/{report_id}/merge`
- `POST /api/admin/reports/{report_id}/decision`

## Sanitized media, donations, expenses, and transparency

Apply `supabase/migrations/20261005000000_add_private_media_finance_transparency.sql`.
All new images are decoded with Pillow, pixel-limited, EXIF-oriented, copied into
a fresh pixel buffer, and re-encoded as JPEG, PNG, or WebP without EXIF, GPS,
ICC, XMP, comments, or original bytes. Defaults are an 8 MiB input limit and
25 million pixels; configure `MEDIA_MAX_UPLOAD_BYTES` and `MEDIA_MAX_PIXELS`.

Private buckets and paths:

- `report-media/<report-uuid>/<generated-uuid>.<extension>`
- `donation-proofs/<citizen-uuid>/<generated-uuid>.<extension>`
- `expense-receipts/<report-uuid>/<generated-uuid>.<extension>`

Upload and review endpoints:

- `POST /api/reports/with-photo` (multipart citizen report)
- `POST /api/coordinator/reports/{report_id}/evidence/upload`
- `POST /api/donations` and `POST /api/admin/donations/{id}/review`
- `GET /api/admin/donations/pending` and `GET /api/admin/donations/{id}/proof`
- `POST /api/coordinator/expenses` and `POST /api/admin/expenses/{id}/review`
- `GET /api/admin/expenses/pending` and `GET /api/admin/expenses/{id}/receipt`
- `GET /api/transparency?currency=<ISO-4217-code>`

Donation verification remains manual: the screenshot is evidence for an Admin
to compare against FixIt's external Easypaisa/JazzCash account record. There is
no payment-provider API integration. Public totals include only `Verified`
donations and `Approved` expenses in the requested currency. The public output
does not include donor/citizen identity, screenshots, receipts, locations, or
internal review data. Before/After files remain private because no explicit PRD
rule currently authorizes publishing them.

## Analytics, upcoming work, and in-app notifications

Apply `supabase/migrations/20261006000000_add_analytics_upcoming_notifications.sql`.

- `GET /api/admin/analytics?currency=<ISO-4217-code>` is Admin-only. Problem
  metrics count persisted reports by status; `duplicate_merged` counts source
  reports whose `merged_into_report_id` is set. Financial counts and amounts
  are scoped to the requested currency. Only `Verified` donations contribute
  to donation totals, and only `Approved` expenses contribute to spending.
- `GET /api/upcoming-work` is public and returns future `Scheduled` work with
  tracking ID, category, schedule, and work details. It intentionally omits
  latitude, longitude, report description, and citizen identity.
- `GET /api/notifications` lists the authenticated Citizen's notifications.
- `POST /api/notifications/{notification_id}/read` marks only that Citizen's
  own notification as read.

Database-triggered in-app notifications are created for every reporter when a
report becomes `Approved`, `Rejected`, `Scheduled`, `In Progress`, or `Solved`.
Merged reporters remain associated through `report_reporters` and therefore
receive later updates. This is an in-app foundation only; SMS/Phone OTP remains
postponed and is not replaced by these notifications.
