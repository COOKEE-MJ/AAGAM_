# Backend API contract

Base URL: `http://localhost:3000`. JSON requests use `Content-Type: application/json`. Authenticated calls use `Authorization: Bearer <JWT>`. Citizen signup creates citizen accounts only; authority accounts are provisioned separately and carry a district scope.

## Read endpoints

| Method and path | Access | Result |
|---|---|---|
| `GET /api/alerts?district=New%20Delhi&hazard=flood` | Public: published and unexpired only. Authority status queries require a district scope. | `{ "alerts": [...], "serverTime": "..." }`; alert rows include official source URL, publication time, and fetch time. |
| `GET /api/shelters?district=New%20Delhi&lat=28.61&lng=77.20` | Public | `{ "shelters": [...] }`; nearest first when coordinates are supplied, with `distanceKm` and `updatedAt`. This endpoint sorts by distance; it does not impose a radius cutoff. |
| `GET /api/sos?status=new` | Authority JWT with district scope | `{ "sos": [...] }`, restricted by stored district. |
| `GET /api/sos/mine` | Authenticated citizen | The caller's own SOS events. |
| `GET /api/reports?status=needs_review` | Authority JWT with district scope | `{ "reports": [...] }`, restricted by stored district. |
| `GET /api/reports/mine` | Authenticated citizen | The caller's own reports. |
| `GET /api/heatmap?hours=24&cell=0.05` | Authority JWT with district scope | `{ "cellSizeDeg": 0.05, "hours": 24, "cells": [...], "generatedAt": "..." }`; cells are restricted to the officer's district. |

## Write endpoints

| Method and path | Access and behavior |
|---|---|
| `POST /api/auth/signup` | Public. Body: `{ "name": "Asha", "phone": "9000000002", "password": "...", "homeDistrict": "New Delhi", "homeState": "Delhi" }`. Returns `{ "token": "...", "user": {...} }`. OTP is mocked; no SMS is sent and no OTP is verified. |
| `POST /api/auth/login` | Public. Body: `{ "phone": "9000000002", "password": "..." }` (email may replace phone). Returns token and public user. |
| `POST /api/sos/trigger` | Guest or authenticated citizen according to `ALLOW_GUEST_SOS`. Body: `{ "clientId": "<persistent-uuid>", "lat": 28.61, "lng": 77.20, "timestamp": "2026-10-20T10:00:00Z", "hazard": "flood", "peopleCount": 1, "injured": false }`. First create returns HTTP 201; replay returns HTTP 200 and `duplicate: true`. An offline phone queue has not sent the SOS to this API. |
| `POST /api/reports` | Guest or authenticated citizen according to `ALLOW_GUEST_SOS`. Body: `{ "clientId": "<persistent-uuid>", "lat": 28.61, "lng": 77.20, "type": "flooding", "hazard": "flood", "photoData": "data:image/jpeg;base64,...", "note": "..." }`. First create returns HTTP 201; replay returns HTTP 200 and `duplicate: true`. |
| `POST /api/sync` | Creates SOS/report queue items independently; `sos_update` requires an authenticated citizen and ownership. Example body: `{ "items": [{ "type": "sos", "clientId": "<uuid>", "lat": 28.61, "lng": 77.20 }, { "type": "report", "clientId": "<uuid>", "lat": 28.61, "lng": 77.20, "reportType": "flooding" }, { "type": "sos_update", "clientId": "<uuid>", "status": "cancelled" }] }`. Returns one result per item: `created`, `duplicate`, `updated`, or `error`. A failed item does not stop the batch. `sos_update` accepts `peopleCount`, `injured`, `note`, and cancellation; other status changes are rejected. |
| `PATCH /api/sos/:id` | Owner citizen may cancel/edit their own event; authority with matching district may transition status. Citizen cancellation body: `{ "status": "cancelled" }`. Officer statuses: `acknowledged`, `dispatched`, `resolved`, `duplicate`. |
| `PATCH /api/reports/:id` | Authority with matching district. Body example: `{ "status": "rejected", "rejectReason": "duplicate" }`; or `{ "status": "needs_more_info", "officerNotes": "Please add context" }`. |
| `GET /api/reports/:id/photo` | Authority with matching district. Returns `{ "photoData": "..." }`. |
| `POST /api/ai/verify-image` | Body: `{ "photoData": "data:image/jpeg;base64,...", "type": "flooding" }`. Returns `{ "label": "flood", "confidence": 0.85, "mode": "mock" }` in mock mode. A confidence score is triage assistance, not proof that an image is genuine. |
| `POST /api/alerts` | Authority in the alert district, or radar key via `X-Radar-Key`. Requires `hazard`, `severity`, `title`, `district`, `sourceName`, and `sourceUrl`. Manual authority alerts and radar records use the official-source/review rules in the route. |
| `PATCH /api/alerts/:id` | Authority with matching district. Body can update `status`, `severity`, `title`, `message`, or `validUntil`. |
| `POST /api/shelters` and `PATCH /api/shelters/:id` | Authority with matching district. Create requires `name`, `district`, `lat`, `lng`, and `capacity`; patch supports occupancy/capacity/contact/open/closed updates. |

## Idempotency and ownership

Clients generate and persist a random `clientId` before queueing. The database enforces uniqueness. Replaying an ID from another account returns an error; an unauthenticated replay receives only a minimal duplicate acknowledgement, not the record's location, phone number, note, or photo metadata. The API does not create or persist the client-side queue.

## Error shape

Errors use `{ "error": "message" }`. Common statuses are 400 for invalid input, 401 for missing/invalid login, 403 for role or district denial, 404 for missing or inaccessible records, 409 for conflicting IDs or invalid transitions, 413 for oversized bodies, and 429 for rate limits.
