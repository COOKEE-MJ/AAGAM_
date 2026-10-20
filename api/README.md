# AAGAM API Service (`api/`)

This directory provides the central backend REST API services for the AAGAM emergency disaster intelligence platform, connecting to PostgreSQL 16 + PostGIS.

## Core Endpoints
- `GET /api/alerts`: Spatial query for active published disaster alerts (`?lat=&lng=&radius=50`)
- `GET /api/shelters`: PostGIS nearest-first distance calculation (`?lat=&lng=`)
- `POST /api/sos/trigger`: Emergency distress write with duplicate prevention (`clientId`)
- `POST /api/sync`: Batch offline sync queue replay for queued SOS and incident reports
- `GET /api/heatmap`: Authority spatial density grid aggregation using `ST_SnapToGrid`
- `GET/POST /api/reports`: Crowdsourced natural disaster damage reporting with AI triage
- `POST /api/auth/login`: Authority officer authentication with scoped JWT tokens

## Running
```bash
npm start      # Starts on port 3000
npm run dev    # Starts with hot reload
```

