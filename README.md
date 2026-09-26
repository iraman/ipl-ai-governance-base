# ipl-ai-governance-base (Trimble WorkRide)

Simple web app for employees to book the office shuttle (metro ↔ office). Admin can view bookings, assign vehicles, and mark no-shows.

This repository is the GitHub project base: WorkRide (`frontend/` + `backend/`), a dummy Express app in `/src/`, and versioned **Agent Governance Lifecycle (AGL)** assets in `.ai-governance/` (PR review, CI validation, `behavior-manifest.json`).

## Agent Governance (AGL)

Behavioral assets live in `.ai-governance/` and are loaded by Cursor via `.cursor/rules/workride-agl.mdc`.

| Asset | Purpose |
|-------|---------|
| `global-security-policy.md` | Secrets, tokens, CORS, input validation |
| `architectural-standards.md` | `/src/` dummy app vs WorkRide `frontend/` + `backend/` |
| `rules/trimble-id-auth.md` | Trimble ID OAuth; no token storage in `localStorage` |
| `rules/booking-policies.md` | Cutoffs, cancel window, no-show policy (aligned with `backend/rules.js`) |
| `rules/architecture-guidelines.md` | WorkRide stack and API conventions |
| `skills/validate-booking-rules/` | Skill for reviewing booking changes |
| `prompts/pr-review-behavioral-assets.md` | PR review template for rule changes |

**Validate locally:**

```bash
npm run governance:check      # structure + policy regression tests
npm run governance:manifest   # refresh behavior-manifest.json hash
```

**Adoption playbook:** [.ai-governance/ADOPTION.md](./.ai-governance/ADOPTION.md)  
**PR checklist:** [.ai-governance/PR_REVIEW_CHECKLIST.md](./.ai-governance/PR_REVIEW_CHECKLIST.md)

CI runs on changes to governance files (see `.github/workflows/agl-validation.yml`).

## Rules

- **Morning slots:** 7:30 AM, 8:30 AM (Metro → Office). **Book by 8 PM previous evening.**
- **Evening slots:** 5:00 PM, 6:00 PM (Office → Metro). **Book by 3 PM same day.**
- **Cancel:** Allowed until **1 hour before** the slot start time.
- **No-show:** 2 consecutive no-shows → employee **can sign in but cannot book for the next 1 day.**

## Stack

- **Backend:** Node.js, Express, JSON file store (no database install)
- **Frontend:** React (Vite), React Router

## Setup

### Backend

```bash
cd backend
npm install
npm run dev        # start API on http://localhost:3001 (creates data/store.json with seed data on first run)
```

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_TRIMBLE_CLIENT_ID`. Do not commit `.env`.

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open **http://127.0.0.1:5173/login**. The frontend proxies `/api` to the backend.

Trimble Console URLs for local OAuth:

- Callback: `http://127.0.0.1:5173/callback`
- Logout: `http://127.0.0.1:5173/logout-callback`

Gateway API base: `https://trimbleworkride.dev.api.trimblecloud.com`

### Dummy AGL app (`/src/`)

```bash
npm install
npm run dev        # http://localhost:4000
```

## Usage

1. **Login** — Trimble ID OAuth in production; email-based dummy login for local development (see [TRIMBLE_ID_SETUP.md](./TRIMBLE_ID_SETUP.md)).
2. **Book Shuttle** — Pick date and slot (bookings are for the logged-in user). Cutoff times are enforced; blocked users cannot book.
3. **My Bookings** — View and cancel your upcoming bookings (cancel allowed until 1 hour before slot).
4. **Admin** — Pick a date to see all bookings, assign vehicles, and mark no-shows. After 2 consecutive no-shows, the user can sign in but cannot book for 1 day.

## Demo data

On first run the backend creates `backend/data/store.json` with:

- **Slots:** 7:30 & 8:30 (morning), 5:00 & 6:00 (evening)
- **Users:** Admin, John Doe, Jane Smith (non-admin)
- **Vehicles:** Shuttle A, Shuttle B

Add more users via **Book Shuttle** (dropdown) or API `POST /api/users`.

## Share & deploy

- **Share with team:** See [DEPLOY_AND_SHARE.md](./DEPLOY_AND_SHARE.md) for Git setup, zip share, and how others can run the app.
- **Deploy to gateway:** Same doc has build steps, production run, env vars, PM2/systemd, and reverse-proxy (e.g. nginx) for deploying Trimble WorkRide.
