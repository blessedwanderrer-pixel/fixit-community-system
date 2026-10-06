# FixIt — Community Problem & Donation Tracking System

FixIt is a community-service platform for reporting local problems, coordinating verified repair work, and showing the public how donations are received and spent. It combines a React web application, a FastAPI service, Supabase authentication/storage/database services, and advisory AI-assisted triage.

## Production

- Frontend: https://fixit-frontend.vercel.app
- Backend API: https://fixit-community-api.vercel.app
- Health check: https://fixit-community-api.vercel.app/health

## Roles

- **Citizen:** creates and tracks problem reports, receives in-app status notifications, submits donation proof, and views public transparency and upcoming-work information.
- **Admin:** reviews reports and AI triage, approves or rejects reports, reviews possible duplicates and performs explicit merges, verifies donations, approves expenses, and views operational analytics.
- **Coordinator:** schedules approved work, updates its progress, uploads completion evidence, and records expenses with private receipts for Admin review.

## Main workflow

1. A Citizen submits a categorized problem with a description, location, and optional sanitized photo.
2. The backend persists the report, checks for nearby possible duplicates, and requests advisory AI triage when configured.
3. An Admin reviews the report, duplicate candidates, and triage result, then approves, rejects, or explicitly merges the report.
4. A Coordinator schedules approved work, marks progress, and supplies evidence before a report can be marked solved.
5. Status changes create in-app notifications for the reporting Citizens, including Citizens attached through a merged report.
6. Verified donations and approved spending are aggregated for the public transparency view, while proofs, receipts, identities, and internal review data remain private.

## AI triage

The backend can send a newly submitted report to Groq for structured triage. The response is schema-validated and stored only as advisory information for Admin review. AI cannot approve, reject, or merge reports, and an AI/network failure does not discard an already submitted report.

## Duplicate detection within 100 m

PostGIS geography checks flag reports in the same category when an eligible existing report is within 100 metres. Detection creates review candidates only; it never merges reports automatically. Citizens see a warning and candidate count, while detailed candidate information and the merge action remain Admin-only.

## Donation and spending transparency

Donation proof and expense receipts are stored privately and reviewed manually. Public totals include only **Verified** donations and **Approved** expenses, grouped by the requested ISO 4217 currency. The public API deliberately excludes donor identity, citizen identity, screenshots, receipts, precise locations, and internal review information.

## Tech stack

- Frontend: React 19, TypeScript, Vite, React Router, Tailwind CSS, Motion, Supabase JS
- Backend: Python, FastAPI, Pydantic Settings, HTTPX, Pillow
- Data and auth: Supabase Postgres, PostGIS, Auth, Row Level Security, private Storage buckets
- AI triage: Groq API with structured output validation
- Deployment: Vercel (separate frontend and backend projects)
- Testing: Pytest for backend behavior and migration contracts; TypeScript type checking and Vite production builds for the frontend

## Local setup

### Backend

Requires Python 3.10 or newer.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

Apply the SQL files in `backend/supabase/migrations` to a Supabase project in timestamp order before exercising database-backed workflows.

### Frontend

Requires a current Node.js release.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend development server runs on `http://localhost:3000` and the backend defaults to `http://127.0.0.1:8000` or `http://localhost:8000`.

## Environment variables

Only variable names are documented here. Keep values in local `.env` files or encrypted deployment settings; never commit them.

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

Backend:

- `APP_NAME`
- `APP_ENVIRONMENT`
- `DEBUG`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_REQUEST_TIMEOUT_SECONDS`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `MEDIA_MAX_UPLOAD_BYTES`
- `MEDIA_MAX_PIXELS`
- `CORS_ORIGINS`

`SUPABASE_SECRET_KEY` and `GROQ_API_KEY` are backend-only secrets. Never expose either through a `VITE_*` variable.

## Testing

Backend tests cover health, authentication and role enforcement, report workflow transitions, duplicate detection, AI triage failure handling, media sanitization, donations, expenses, transparency, community endpoints, and migration contracts. Frontend verification uses TypeScript's no-emit check and a production Vite build.

Latest pre-publication verification: **75 backend tests passed**, the frontend TypeScript check passed, and the frontend production build completed successfully. The build reports only advisory warnings about a future Vite config-loader change and bundle chunk size.

Run the checks locally:

```powershell
cd backend
python -m pytest

cd ..\frontend
npm run lint
npm run build
```

## Current limitation

SMS notifications and Phone OTP are postponed and are **not implemented**. Current status notifications are in-app only; authentication uses the configured Supabase Auth flow.
