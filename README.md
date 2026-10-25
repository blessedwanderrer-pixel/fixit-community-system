<a id="top"></a>

# 🛠️ FixIt — Stronger communities, one repair at a time

<p align="center">
  <img src="frontend/public/brand/fixit-logo-transparent.png" alt="FixIt community platform logo" width="160" />
</p>

<p align="center">
  <strong>Report a problem. Coordinate a repair. See where every donation goes.</strong><br />
  🌍 English · اردو · پښتو
</p>

<p align="center">
  <a href="https://fixit-community-web.vercel.app">🚀 Explore FixIt</a> ·
  <a href="#quick-start">💻 Run locally</a> ·
  <a href="#workflow">🔄 Follow the workflow</a> ·
  <a href="#testing">🧪 Run checks</a>
</p>

FixIt is a community-service platform for reporting local problems, coordinating verified repair work, and showing the public how donations are received and spent. It combines a React web application, a FastAPI service, Supabase authentication/storage/database services, and advisory AI-assisted triage.

## 🚀 Explore FixIt

- [Open the community website](https://fixit-community-web.vercel.app)
- [Backend API](https://fixit-community-api.vercel.app)
- [API health check](https://fixit-community-api.vercel.app/health)

## 👥 Find your role

- **Citizen:** creates and tracks problem reports, receives in-app status notifications, submits donation proof, and views public transparency and upcoming-work information.
- **Admin:** reviews reports and AI triage, approves or rejects reports, reviews possible duplicates and performs explicit merges, verifies donations, approves expenses, and views operational analytics.
- **Coordinator:** schedules approved work, updates its progress, uploads completion evidence, and records expenses with private receipts for Admin review.

<a id="workflow"></a>

## 🔄 How FixIt works

1. A Citizen submits a categorized problem with a description, location, and optional sanitized photo.
2. The backend persists the report, checks for nearby possible duplicates, and requests advisory AI triage when configured.
3. An Admin reviews the report, duplicate candidates, and triage result, then approves, rejects, or explicitly merges the report.
4. A Coordinator schedules approved work, marks progress, and supplies required before/after evidence for Admin verification.
5. An Admin approves the completed work or objects with a required reason; only approved work is marked solved and published.
6. Status changes create in-app notifications for the reporting Citizens, including Citizens attached through a merged report.
7. Verified donations and approved spending are aggregated for the public transparency view, while financial proofs, receipts, identities, and internal review data remain private.

## ✨ What you can do

- 🌐 Switch between English, Urdu, and Pashto, with right-to-left layouts for Urdu and Pashto.
- 🔑 Create a Citizen account, confirm your email, and recover access through the password-reset flow.
- 📬 Enable coordinator email reminders for work scheduled in approximately three hours, when backend email and scheduling are configured.

- Optional Urdu and Pashto AI Voice Complaint Assistant alongside the unchanged manual complaint form.
- Browser-based recording with editable transcription, editable complaint text, and a suggested category before submission.
- Groq Whisper multilingual speech transcription using explicit Urdu (`ur`) and Pashto (`ps`) language selection.
- Schema-validated AI triage that summarizes complaints, assigns advisory priority, and supports English, Urdu, and Pashto descriptions without changing the report workflow.
- Privacy-conscious duplicate detection for nearby reports, with Admin-only review and explicit merging.
- Role-based Citizen, Admin, and Coordinator dashboards and permissions.
- Scheduled and upcoming-work views, progress tracking, before/after evidence requirements, AI-assisted evidence comparison, and Admin approval or objection.
- Donation-proof submission, Admin verification, expense review, and public financial transparency totals.
- Responsive civic-tech UI with accessible motion preferences and optional interaction-driven sound effects.

Voice assistance is optional and never submits a report automatically. Citizens can edit, replace, or clear the generated text, and both voice-assisted and manually typed complaints use the same existing validation and submission workflow.

## 🧠 Advisory AI triage

The backend can send a newly submitted report to Groq for structured triage. The response is schema-validated and stored only as advisory information for Admin review. It accepts complaint descriptions in English, Urdu, and Pashto while preserving the existing output schema. AI cannot approve, reject, or merge reports, and an AI/network failure does not discard an already submitted report.

## 🎙️ Voice complaints

Authenticated Citizens can optionally record a complaint in Urdu or Pashto from the existing report form. The backend sends the selected language code and audio to Groq Whisper, then returns a transcription, an editable complaint draft, and a category suggestion from FixIt's supported categories. Urdu remains the default language, Pashto never silently falls back to Urdu, and recording limits, MIME validation, authentication, and manual editing remain enforced. Audio transcription does not automatically create or submit a report.

## 📍 Duplicate detection within 100 m

PostGIS geography checks flag reports in the same category when an eligible existing report is within 100 metres. Detection creates review candidates only; it never merges reports automatically. Citizens see a warning and candidate count, while detailed candidate information and the merge action remain Admin-only.

## 💚 Donation and spending transparency

Donation proof and expense receipts are stored privately and reviewed manually. Public totals include only **Verified** donations and **Approved** expenses, grouped by the requested ISO 4217 currency. The public API deliberately excludes donor identity, citizen identity, screenshots, receipts, precise locations, and internal review information.

## 🧰 Tech stack

- Frontend: React 19, TypeScript, Vite, React Router, Tailwind CSS, Motion, Supabase JS
- Backend: Python, FastAPI, Pydantic Settings, HTTPX, Pillow
- Data and auth: Supabase Postgres, PostGIS, Auth, Row Level Security, private Storage buckets
- AI services: Groq Whisper for Urdu/Pashto transcription and Groq structured output for advisory triage
- Deployment: Vercel (separate frontend and backend projects)
- Testing: Pytest for backend behavior and migration contracts; TypeScript type checking and Vite production builds for the frontend

<a id="quick-start"></a>

## 💻 Quick start

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

Apply the SQL files in `backend/supabase/migrations` to a Supabase project in timestamp order before exercising database-backed workflows. Configure email confirmation and password-reset redirect URLs as described in [the authentication setup guide](frontend/PASSWORD_RESET_SETUP.md).

### Frontend

Requires Node.js compatible with the Vite version in `frontend/package.json`.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

The frontend development server runs on `http://localhost:3000` and the backend defaults to `http://127.0.0.1:8000` or `http://localhost:8000`.

## 🔐 Environment variables

Copy the placeholder templates: [frontend configuration](frontend/.env.example) and [backend configuration](backend/.env.example). Keep actual values in local `.env` files or encrypted deployment settings; never commit them.

<details>
<summary>🔎 Expand the configuration reference</summary>


Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`
- `VITE_PASSWORD_RESET_REDIRECT_URL`
- `VITE_SIGNUP_REDIRECT_URL`

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
- `GROQ_VISION_MODEL`
- `MEDIA_MAX_UPLOAD_BYTES`
- `MEDIA_MAX_PIXELS`
- `CORS_ORIGINS`
- `CRON_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_FROM_EMAIL`
- `GOOGLE_APP_PASSWORD`
- `PUBLIC_FRONTEND_URL`

`SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `CRON_SECRET`, and `GOOGLE_APP_PASSWORD` are backend-only secrets. Never expose them through a `VITE_*` variable. All `VITE_*` values are visible in the browser.

</details>

<details>
<summary>📬 How coordinator reminders are configured</summary>

Apply the coordinator-reminder migration, configure the backend SMTP settings, Google app password, cron secret, and public frontend URL, then schedule authenticated calls to `/api/internal/scheduled-work-reminders`. The route requires `Authorization: Bearer <CRON_SECRET>`. The reminder service claims due work, sends assignment details to its coordinator, and records delivery results. Deployment scheduling is defined in [backend/vercel.json](backend/vercel.json).

</details>

<a id="testing"></a>

## 🧪 Testing

Backend tests cover health, authentication and role enforcement, report workflow transitions, Urdu/Pashto voice complaint processing, duplicate detection, AI triage failure handling, media sanitization, donations, expenses, transparency, community endpoints, and migration contracts. Frontend verification includes Vitest tests for authentication and translations, TypeScript's no-emit check, and a production Vite build.

Verified on **25 October 2026**: **99 backend tests** and **19 frontend tests** passed, along with TypeScript checking and the production build. The build reports an advisory bundle-size warning.

Run the checks locally:

```powershell
cd backend
python -m pytest

cd ..\frontend
npm run test
npm run lint
npm run build
```

## 🚧 Current limitations

SMS notifications and Phone OTP are postponed and are **not implemented**. Citizens receive report status notifications in-app; configured email reminders are for Coordinators. Authentication uses Supabase Auth. Donations are verified manually; there is no payment-provider API integration.


## 🗂️ Explore the repository

| Folder | What lives here |
| --- | --- |
| [`frontend/`](frontend/) | React app, role dashboards, translations, and authentication pages |
| [`backend/app/`](backend/app/) | FastAPI routes, business rules, and service integrations |
| [`backend/supabase/migrations/`](backend/supabase/migrations/) | Database schema, access policies, and workflow functions |
| [`backend/tests/`](backend/tests/) | Backend behavior and migration checks |

<details>
<summary>🙋 Frequently asked questions</summary>

**Does AI decide which reports get approved?**

No. AI offers advisory triage and evidence analysis. Admins make report and completion decisions.

**Can I report a problem without recording my voice?**

Yes. The manual complaint form is available, and voice-generated drafts remain editable before submission.

**Are donation receipts public?**

No. Financial proofs and receipts stay private. Public transparency shows verified donations and approved expenses by currency.

**Can I register as an Admin or Coordinator?**

Public signup creates Citizens. Privileged roles require a trusted administrative process.

</details>

[⬆️ Back to top](#top)
