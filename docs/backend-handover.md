# AAGAM: Backend Handover & Developer Guide (Member 2 Lane)

Node.js + Express + PostgreSQL/PostGIS. This handover describes the backend branch. It is not a statement that the frontend checklist is complete. The automated test commands are documented below; their current result must be established by running them against a configured PostGIS database.

---

## Handover Checklist for M2

### Implemented backend components:
- **Database schema with PostGIS**, 11 hazard types, spatial tables (`alerts`, `shelters`, `sos_events`, `reports`, `radar_snapshots`, `sms_log`, `users`), seed data for New Delhi, and demo logins.
- **Contract Endpoints:**
  - `GET /api/alerts`: spatial query with radius, status filtering, deduplication.
  - `GET /api/shelters`: nearest shelter query with capacity & distance in km.
  - `POST /api/sos/trigger`: idempotent SOS creation using `clientId`.
  - `POST /api/sync`: offline batch creation for `sos` and `report`, plus owner-checked `sos_update` items.
  - `POST /api/reports`: crowd-sourced photo reports with AI verification triage.
  - `POST /api/ai/verify-image`: AI verification endpoint (mock/live).
  - `GET /api/heatmap`: PostGIS grid-based aggregation of incidents for command dashboard.
- **Officer Action Endpoints:**
  - `PATCH /api/sos/:id`: status transitions (`acknowledged`, `dispatched`, `resolved`, `duplicate`).
  - `PATCH /api/reports/:id`: verify/reject incident reports.
  - `POST /api/alerts` & `PATCH /api/alerts/:id`: create, publish, withdraw alerts.
  - `POST /api/shelters` & `PATCH /api/shelters/:id`: occupancy adjustments and status updates.
- **JWT Authentication:** Two roles (`citizen`, `authority`), bcrypt password hashing, token validation middleware.
- **Verification:** `npm test` and `npm run smoke` are available. The smoke suite requires a running PostGIS-backed API; do not report a passing result until they have been run.

See [backend-contract.md](backend-contract.md) for request/response examples and [privacy-notice.md](privacy-notice.md) for the notice text that the client must show before collecting personal data.

---

## Local Setup (5 Commands)

```bash
# 1. Environment configuration
cp .env.example .env
# Set JWT_SECRET in .env to a random value of at least 32 characters before starting.

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

