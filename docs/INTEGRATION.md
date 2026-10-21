# AAGAM full-stack integration

One backend serves everything. The vision service and the radar plug in through the contracts below.

```
 radar/ (Python)  --POST /api/alerts + X-Radar-Key-->  src/ (Express + PostGIS, :3000)
 vision/server.py <--POST /verify-image {image,type}--  |  serves  /citizen/   (PWA)
      (:8000)                                            |          /authority/ (dashboard)
                                                         '-- /api/*  (JSON)
```

## Run everything (5 terminals max, 3 minimum)
```bash
cp .env.example .env            # set JWT_SECRET (32+ chars), keep RADAR_API_KEY the same everywhere
docker compose up -d db         # Postgres 16 + PostGIS
npm install
npm run db:init && npm run db:seed
npm start                       # API + both frontends on :3000
npm run vision                  # optional: set AI_MODE=live in .env to use it
npm run radar:push              # optional: pushes radar/output/live_normalized_alerts.json to the API
```
Open `http://localhost:3000/citizen/` and `http://localhost:3000/authority/`.
Demo logins (password `Demo@1234`): officer `9000000001`, citizen `9000000002`.

## Seams
| Seam | Contract | Notes |
|---|---|---|
| Frontend -> API | `window.AAGAM_API_BASE`, default same-origin `/api` on :3000 | override if hosted elsewhere |
| API -> Vision | `POST $VISION_URL {image, type}` -> `{label, confidence}` | `AI_MODE=live`; on any failure the report goes to `needs_review` |
| Radar -> API | `POST /api/alerts` with `X-Radar-Key` | official `.gov.in/.nic.in` + valid + not expired = published, else `pending` |

## Known limits
- `vision/triage.py` is a deterministic **mock** (label follows the citizen's chosen type). No real model yet.
- `radar/output/*.json` are stored snapshots; live data needs `python radar/run_live.py` with network access to IMD.
- `frontend/` and `web/` are identical copies; `frontend/` is the one served. `web/` can be deleted.
- `npm run smoke` assumes `AI_MODE=mock` (its reports carry no photo).
