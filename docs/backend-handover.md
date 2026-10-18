# AAGAM: Backend Handover & Developer Guide (Member 2 Lane)

Node.js + Express + PostgreSQL/PostGIS. This service was initialized by M4 (with pair programming) on 18 Oct while M2 was away. **It is complete for every MUST item in the Master Execution Plan (Part 3 and Part 5 contracts) and passes all smoke tests against a real PostGIS database.**

---

## Handover Checklist for M2

### What is already done (100% complete):
- **Database schema with PostGIS**, 11 hazard types, spatial tables (`alerts`, `shelters`, `incidents`, `sms_log`, `users`), seed data for New Delhi, and demo logins.
- **Contract Endpoints:**
  - `GET /api/alerts`: spatial query with radius, status filtering, deduplication.
  - `GET /api/shelters`: nearest shelter query with capacity & distance in km.
  - `POST /api/sos/trigger`: idempotent SOS creation using `clientId`.
  - `POST /api/sync`: offline batch queue synchronization (`sos` & `reports`).
  - `POST /api/reports`: crowd-sourced photo reports with AI verification triage.
  - `POST /api/ai/verify-image`: AI verification endpoint (mock/live).
  - `GET /api/heatmap`: PostGIS grid-based aggregation of incidents for command dashboard.
- **Officer Action Endpoints:**
  - `PATCH /api/sos/:id`: status transitions (`acknowledged`, `dispatched`, `resolved`, `duplicate`).
  - `PATCH /api/reports/:id`: verify/reject incident reports.
  - `POST /api/alerts` & `PATCH /api/alerts/:id`: create, publish, withdraw alerts.
  - `POST /api/shelters` & `PATCH /api/shelters/:id`: occupancy adjustments and status updates.
- **JWT Authentication:** Two roles (`citizen`, `authority`), bcrypt password hashing, token validation middleware.
- **Verification & Testing:** All 16 unit tests and 23 automated smoke tests passing.

---

## Local Setup (5 Commands)

```bash
# 1. Environment configuration
cp .env.example .env

# 2. Database service (Postgres 16 + PostGIS)
# Ensure PostgreSQL service is active or run:
docker compose up -d db

# 3. Install dependencies
npm install

# 4. Initialize schema and seed data
npm run db:init
npm run db:seed

# 5. Launch development server (Port 3000)
npm run dev
```

Run smoke tests in a separate terminal:
```bash
npm run smoke
```

**Demo Logins:**
- **Authority / Officer:** `9000000001` / `Demo@1234`
- **Citizen:** `9000000002` / `Demo@1234`

---

## Integration Notes for M1 & M3

1. **M1 (Frontend / PWA & Dashboard):**
   - API runs on `http://localhost:3000`.
   - CORS is enabled for all development origins.
   - Swap out `mockData.json` calls with the real REST endpoints documented below.
2. **M3 (AI & TinyFish Radar):**
   - TinyFish Radar can push scraped bulletins via `POST /api/alerts` with header `X-Radar-Key: <radar_key>`.
   - Bulletins from `.gov.in` and `.nic.in` domains auto-publish; others go to `pending` queue.
   - Connect live Vision model by setting `AI_MODE=live` and `VISION_URL=<m3_endpoint>` in `.env`.

