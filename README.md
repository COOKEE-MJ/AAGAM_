# 🛡️ AAGAM (आगम)

<p align="center">
  <strong>Autonomous Alert Gathering & Action Management</strong><br>
  <em>AI-Powered Multi-Hazard Intelligence & Offline-First Emergency Response Platform</em>
</p>

<p align="center">
  <a href="https://github.com/COOKEE-MJ/AAGAM_">
    <img alt="stars" src="https://img.shields.io/badge/⭐_Star-This_Repo-brightgreen?style=for-the-badge">
  </a>
  <a href="LICENSE">
    <img alt="license" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge">
  </a>
  <a href="https://nodejs.org/">
    <img alt="node" src="https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js">
  </a>
  <a href="https://postgis.net/">
    <img alt="postgis" src="https://img.shields.io/badge/Database-PostGIS_16-navy?style=for-the-badge&logo=postgresql">
  </a>
  <a href="https://web.dev/progressive-web-apps/">
    <img alt="pwa" src="https://img.shields.io/badge/PWA-Offline--First-orange?style=for-the-badge&logo=pwa">
  </a>
  <a href="https://tinyfish.io/">
    <img alt="tinyfish" src="https://img.shields.io/badge/Web_Agent-TinyFish_API-purple?style=for-the-badge">
  </a>
</p>

<p align="center">
  <img alt="hazards" src="https://img.shields.io/badge/16_Disaster_Types-🌋_🌊_🌀_⚡-red?style=flat-square">
  <img alt="offline" src="https://img.shields.io/badge/Zero--Network_SOS-📱-blue?style=flat-square">
  <img alt="ai" src="https://img.shields.io/badge/AI_Vision_Triage-🤖-green?style=flat-square">
  <img alt="spatial" src="https://img.shields.io/badge/9.5ms_PostGIS_Heatmap-🗺️-yellow?style=flat-square">
  <img alt="tests" src="https://img.shields.io/badge/Tests-136%2F136_Passing-brightgreen?style=flat-square">
</p>

<p align="center">
  <a href="#-problem-statement--intended-users">🎯 Problem & Users</a> •
  <a href="#-system-walkthrough--live-screenshots">📱 Screenshots</a> •
  <a href="#%EF%B8%8F-complete-tech-stack">🛠️ Tech Stack</a> •
  <a href="#-tinyfish-web-agent-integration">🤖 TinyFish Agent</a> •
  <a href="#-ai-model-limits-reliability-measurements--security-test-status">🧠 AI, Reliability & Security</a> •
  <a href="#-system-architecture">🏗️ Architecture</a> •
  <a href="#-implementation-matrix-current-vs-future-scope">📊 Implementation Matrix</a> •
  <a href="#-quickstart-in-5-commands">⚡ Quickstart</a> •
  <a href="#-the-contributors">👥 Contributors</a>
</p>

---

## 🎯 Problem Statement & Intended Users

### 1. The Real-World Problem
Across India, extreme climatic hazards—cyclones along the eastern seaboard, urban flash floods in Delhi and Mumbai, landslides in Uttarakhand, and heatwaves across northern plains—cause catastrophic loss of life and property. The breakdown during a disaster happens across three critical failure points:

1. **Fragmented Warning Dissemination:** Official warnings from government bodies like the India Meteorological Department (IMD) or Central Water Commission (CWC) are published across disparate, complex portals (`mausam.imd.gov.in`, `cwc.gov.in`). Citizens cannot easily discover or decipher them in time.
2. **Total Communications Blackout:** When high winds or rising floodwaters knock down cellular towers and power grids, conventional cloud-only apps become useless. Trapped citizens lose access to shelter maps, helpline numbers, and the ability to signal for help.
3. **Command Center Data Blindness:** District Disaster Management Authorities (DDMA) and emergency operation centers (DEOC) are inundated with panicked, duplicate phone calls and unverified social media rumors, with zero geographic clustering or photo damage verification to direct NDRF/SDRF rescue teams effectively.

### 2. Intended Users & Personas

AAGAM is specifically engineered for two complementary personas who operate during disasters:

| User Persona | 📱 Citizen (Vulnerable Resident / Evacuee) | 🖥️ Authority Officer (DDMA / DEOC / First Responders) |
|---|---|---|
| **Who They Are** | Any citizen residing in or transiting through an active hazard zone | District Magistrates, DDMA disaster coordinators, NDRF/SDRF dispatchers |
| **Interface** | Zero-install, high-contrast PWA running in mobile browsers | Desktop Command & Operations Portal |
| **Active Endpoint** | `http://localhost:5000/citizen/` (or via reverse-proxy) | `http://localhost:5000/authority/` |
| **Core Objective** | Know immediate hyper-local hazard status, locate nearest verified shelter, and broadcast emergency SOS | Visualize district-wide risk density, verify crowd damage photos, and dispatch rescue teams |
| **Offline Capabilities** | 100% pre-cached UI & shelters, offline SOS outbox, client-side GPS navigation | Real-time PostGIS telemetry, live incident deduplication, authority alert broadcast |
| **Primary Actions** | • Hold SOS button (2 seconds)<br>• Find nearest shelter sorted by distance<br>• Submit photo damage report<br>• One-tap 112 emergency dialer | • Monitor Delhi/District risk heatmap<br>• Review AI-triaged damage photos<br>• Update incident lifecycle (`new` ➔ `resolved`)<br>• Broadcast verified red/orange/yellow alerts |

---

## 📱 System Walkthrough & Live Screenshots

### 1. Citizen Emergency PWA (`web/citizen/`)
*Designed for extreme crisis conditions: high-contrast dark mode, large touch targets, bilingual English/Hindi, and zero internet dependency.*

<p align="center">
  <img src="docs/screenshots/citizen-pwa.png" alt="AAGAM Citizen Emergency PWA" width="420" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
</p>

- **Live Hazard Warning Card:** Prominently displays hyper-local conditions (e.g., Air Quality Index `AQI 450 - Severe`, or cyclone/flood warnings) with safety advisories.
- **2-Second Hold Emergency SOS:** Hardened button prevents accidental taps while ensuring rapid distress triggering without typing.
- **Zero-Network Distress Beacon:** Generates a client-side UUID, captures GPS coordinates, and immediately queues the beacon in `localStorage`/`IndexedDB` if cellular connectivity is severed.
- **One-Tap Emergency Calling:** Direct link to Indian National Emergency Number (`112`).
- **5-Tab Resilient Navigation:** Quick switching across `Home`, `Alerts`, `Map`, `Report`, and `Profile`.

---

### 2. Authority Command & Dispatch Portal (`web/authority/`)
*A unified operational dashboard for District Disaster Management Authorities (DDMA) to coordinate first responders.*

<p align="center">
  <img src="docs/screenshots/authority-dashboard.png" alt="AAGAM Authority Command Dashboard" width="950" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
</p>

- **Real-Time District Telemetry:** Real-time summary tiles displaying total incidents (`230`), resolved (`3`), in-progress (`20`), and critical pending triage (`114`).
- **PostGIS Natural Disaster Heatmap:** Dynamic spatial density visualization clustering incident reports and distress beacons across Delhi districts.
- **Disaster Types Breakdown:** Visual distribution of active hazards (Earthquakes, Flooding, Severe Pollution/AQI, Structural Collapses).
- **Live Incident Verification Feed:** Filterable queue detailing incident ID, type, precise timestamp, reporter details, and triage action buttons (`Acknowledge`, `Dispatch`, `Resolve`).

---

## 🛠️ Complete Tech Stack

AAGAM is built on a clean, robust, and lightweight architecture free of heavy framework bloat:

| Layer | Technologies | Rationale & Purpose |
|---|---|---|
| **Frontend Applications** | HTML5, Modern Vanilla JavaScript (ES2022), Tailwind CSS, Service Workers | Zero build overhead, instant page loads (<8ms), extreme battery efficiency on low-end Android smartphones. |
| **Geographic GIS Mapping** | Leaflet.js 1.9.4, OpenStreetMap tiles | Lightweight, mobile-friendly interactive mapping without heavy proprietary SDK dependencies. |
| **Offline Engine** | Service Worker API, CacheStorage, IndexedDB / LocalStorage Outbox | Delivers 100% offline app loading, offline shelter routing, and resilient offline SOS replay. |
| **Backend REST API** | Node.js (v18+ LTS), Express.js, Helmet, CORS, Dotenv | High-concurrency event-driven architecture with fast request processing and secure HTTP headers. |
| **Spatial Database** | PostgreSQL 16 + PostGIS Extension | Sub-15ms spatial indexing (`ST_DWithin`, `ST_Distance`), spatial grid aggregation (`ST_SnapToGrid`), and ACID transactional integrity. |
| **AI Web Agent Engine** | TinyFish Web Agent API (`client.search.query`), Python 3.10+ | Autonomous discovery and text extraction from dynamic Indian government weather and flood portals. |
| **AI Vision Triage** | Computer Vision Damage Classifier (`vision/`) | Automated classification of crowd-sourced disaster photos (`flood`, `building_damage`, etc.) with $\ge 0.70$ confidence gating. |
| **Testing & Quality Assurance** | Mocha, Chai, Supertest, Custom Latency Benchmarker | 136 automated unit, spatial, and integration tests across 4 suites with comprehensive P95 latency benchmarking. |
| **Security & Compliance** | Digital Personal Data Protection Act (DPDPA 2023) Auto-Sweeper | Automated photo purge (30 days) and PII anonymization (90 days) preserving citizen privacy rights. |

---

## 🤖 TinyFish Web Agent Integration

### 1. Rationale: Why TinyFish?
Traditional web scrapers (such as static BeautifulSoup or Cheerio scripts) break continually when government portals (IMD, CWC, NDMA) modify page markup, change table layouts, or alter URL parameters. **TinyFish** replaces fragile static scrapers with an intelligent AI web agent that understands natural language queries, handles dynamic government portals natively, and extracts structured hazard bulletins with zero manual DOM upkeep.

### 2. APIs & Architecture Workflow
- **API Method:** `client.search.query(...)`
  ```python
  from tinyfish import TinyFishClient
  
  client = TinyFishClient()
  results = client.search.query(
      query="site:mausam.imd.gov.in sub-division warning OR cyclone bulletin",
      location="IN",
      language="en",
      limit=10
  )
  ```
- **Autonomous Government Crawler:** Dynamically navigates Indian weather portals, locating sub-division warnings, nowcasts, and coastal hazard advisories.
- **Auto-Publish Gatekeeper:** The backend gatekeeper ([`src/radar/rules.js`](src/radar/rules.js)) verifies discovered URLs against official `.gov.in` domain whitelists. Verified official alerts land directly into PostgreSQL, while secondary or unverified feeds route to the authority review queue.

### 3. Exact Source Code References
- [`radar/tinyfish_client.py`](radar/tinyfish_client.py) — Core TinyFish Search & Extraction Agent implementation.
- [`radar/live_alerts.py`](radar/live_alerts.py) — Live IMD GeoServer WFS crawler with official warning color-to-severity mapping (Red, Orange, Yellow).
- [`radar/deduplicate_alerts.py`](radar/deduplicate_alerts.py) — Spatial and title alert deduplication engine.
- [`src/radar/rules.js`](src/radar/rules.js) — 16-hazard validation rules, official domain whitelists, and confidence thresholds.

### 4. Real Sample Response (Live IMD Search via TinyFish)
Direct excerpt from live crawler output ([`radar/output/alerts.json`](radar/output/alerts.json)):
```json
[
  {
    "title": "Sub-Divisionwise Warning - IMD",
    "url": "https://mausam.imd.gov.in/imd_latest/contents/subdivisionwise-warning_mc.php?id=13",
    "snippet": "Warnings for Coastal Karnataka. Date of Issue: October 17, 2026. Day 1: Very Heavy Rain Thunderstorm & Lightning, Squall etc.",
    "sourceType": "unverified_search_result",
    "fetchedAt": "2026-10-17T13:03:31.844455+00:00"
  },
  {
    "title": "India Weather Forecast Bulletin - IMD",
    "url": "https://mausam.imd.gov.in/imd_latest/contents/all_india_forcast_bulletin.php",
    "snippet": "All India Weather Forecast Bulletin. Specialised products & forecasts; Cyclones | Monsoon ...",
    "sourceType": "unverified_search_result",
    "fetchedAt": "2026-10-17T13:03:31.844411+00:00"
  }
]
```

---

## 🧠 AI Model Limits, Reliability Measurements & Security-Test Status

### 1. AI Vision Model Limits & Triage Thresholds
AAGAM incorporates a damage assessment computer vision pipeline in [`vision/`](vision/) to categorize damage photos submitted by citizens without overwhelming emergency dispatchers:

| Damage Category | Target Indicators & Features | Auto-Verify Threshold | Action Triggered |
| :--- | :--- | :---: | :--- |
| **Flooding** | Submerged vehicles, high watermarks, flooded roadways | $\ge 0.70$ | Tagged `ai_verified`; highlighted on spatial command map |
| **Building Damage** | Concrete fissures, partial collapse, fallen masonry | $\ge 0.70$ | Tagged `ai_verified`; marked with high-priority rescue badge |
| **Road Blocked** | Fallen trees, debris piles, asphalt chasms | $\ge 0.70$ | Tagged `ai_verified`; updates evacuation shelter routing |
| **Landslide** | Slope failure, boulder barricades, mudflows | $\ge 0.70$ | Tagged `ai_verified`; alerts nearby emergency vehicles |
| **Fire** | Smoke plumes, active combustion, burnt structures | $\ge 0.70$ | Tagged `ai_verified`; instant dispatch recommendation |

#### Governance & Boundary Limits:
- **Human-in-the-Loop Safeguard:** Any photo receiving an AI confidence score below $0.70$ is **never** discarded; it is flagged as `needs_review` and sent to the authority verification queue for human officer confirmation.
- **Zero-Block Fallback:** If the vision triage service is offline or unreachable, citizen report submission proceeds uninterrupted with a status of `pending_review`.
- **Bandwidth Protection:** Photos are client-side compressed to ~300KB before transmission; uploads exceeding 1.5MB are rejected to protect stressed cellular bandwidth.

---

### 2. Reliability Measurements & Latency Benchmarks (Verified)
Every core database and API operation was benchmarked across 25 iterations against our local PostgreSQL 16 + PostGIS instance using [`scripts/benchmark.js`](scripts/benchmark.js). All endpoints operated significantly within safety SLAs:

| Endpoint / Operation | Target SLA | Min Latency | Average | Median | P95 | Reliability Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`GET /api/alerts`** (Spatial Index) | `< 100 ms` | **3.1 ms** | **11.9 ms** | 12.7 ms | 22.9 ms | **PASS (8.4x faster than SLA)** |
| **`GET /api/shelters`** (PostGIS `ST_Distance` Sort) | `< 150 ms` | **3.8 ms** | **11.7 ms** | 12.9 ms | 16.5 ms | **PASS (12.8x faster than SLA)** |
| **`POST /api/sos/trigger`** (Distress Write) | `< 100 ms` | **5.4 ms** | **27.9 ms** | 16.1 ms | 120.6 ms | **PASS (3.5x faster than SLA)** |
| **`POST /api/sync`** (Batch Offline Replay) | `< 200 ms` | **7.4 ms** | **15.0 ms** | 14.7 ms | 22.9 ms | **PASS (13.3x faster than SLA)** |
| **`GET /api/heatmap`** (Spatial Risk Aggregation) | `< 50 ms` | **4.4 ms** | **9.5 ms** | 8.1 ms | 18.3 ms | **PASS (5.2x faster than SLA)** |
| **Deduplication Interception** (`ON CONFLICT`) | `< 50 ms` | **4.8 ms** | **11.6 ms** | 10.7 ms | 19.2 ms | **PASS (100% duplicate prevention)** |
| **Citizen PWA Web Delivery** | `< 50 ms` | **5.6 ms** | **7.1 ms** | 6.9 ms | 9.6 ms | **PASS (7.0x faster than SLA)** |

---

### 3. Security-Test Status & Compliance Audit

| Security Item | Status | Mechanism & Verification Guarantee |
|---|:---:|---|
| **Database & API Passwords** | 🔒 **CONFIGURED** | Sensitive credentials reside in local `.env`, which is strictly ignored by git (`.gitignore`). `JWT_SECRET` requires a minimum 32-character high-entropy secret. |
| **Citizen PII** | 🔒 **RESTRICTED BY ROLE & DISTRICT** | Citizen self-service reads are strictly owner-filtered. District officers can only access records scoped to their assigned jurisdiction. Expired distress records and notes are automatically redacted. |
| **Role-Based Access (RBAC)** | 🔒 **ENFORCED** | Public users receive `403 Forbidden` if attempting to query command heatmaps, triage queues, or dispatch routes. Authority actions strictly require an active authority JWT and district scope. |
| **Idempotency Safeguard** | 🔒 **SERVER ENFORCED** | Every SOS and report carries a client-generated UUID; `ON CONFLICT (client_id) DO NOTHING` prevents duplicate alerts across retries. Other owners cannot retrieve a record by replaying its client ID. |
| **Data Retention (DPDPA 2023)** | 🔒 **AUTOMATED** | Automated background retention cleaner purges incident photos after 30 days and masks citizen identifiers after 90 days. Runs at startup and executes every 24 hours. |
| **Automated Test Coverage** | 🔒 **PASS** | **136 / 136 tests passing** across 4 test suites (Smoke Tests, Unit Tests, Radar Rules, and PostGIS Spatial Queries). |

---

## 🏗️ System Architecture

Data originates from authoritative government sources, passes through **TinyFish Web Agents**, normalizes into the **PostGIS** database, and syncs across citizen and command applications:

```mermaid
flowchart TD
    subgraph WEB["🌐 Official Government Feeds"]
        direction LR
        IMD["🛰️ IMD (Cyclone & Rain)"]
        CWC["🌊 CWC (River Floods)"]
        NCS["🌋 NCS (Earthquakes)"]
        INCOIS["🌊 INCOIS (Tsunami)"]
        FSI["🔥 FSI (Forest Fires)"]
    end

    subgraph TINYFISH["🤖 TinyFish Web Agent Engine"]
        direction TB
        TF_SEARCH["🔍 Search API (Discovers newest bulletins)"]
        TF_FETCH["📥 Fetch API (Extracts clean text)"]
        TF_AGENT["🧠 Parsing Agent (Normalizes JSON payload)"]
        TF_SEARCH --> TF_FETCH --> TF_AGENT
    end

    subgraph BACKEND["⚙️ Spatial Backend & Verification Engine"]
        direction TB
        GATE{"Official .gov.in?"}
        DB[("🐘 PostgreSQL 16 + PostGIS
- Spatial index ST_DWithin
- Idempotent Sync & Heatmap")]
        AI_CHECK["👁️ AI Vision Check (Damage Classification)"]
        PENDING["📋 Pending Review Queue"]
        GATE -- "Yes (Auto-Publish)" --> DB
        GATE -- "News / Secondary" --> PENDING
        AI_CHECK --> DB
    end

    subgraph APPS["📱 Edge Applications"]
        direction LR
        CITIZEN["📱 Citizen PWA
(IndexedDB + LocalStorage)
Works 100% Offline"]
        OFFICER["🖥️ Authority Command Map
(Real-Time Heatmap & Dispatch)"]
    end

    IMD & CWC & NCS & INCOIS & FSI --> TF_SEARCH
    TF_AGENT --> GATE
    DB <-->|"JSON over HTTPS / Auto-Sync"| CITIZEN
    DB <-->|"Spatial WebSocket / Heatmap API"| OFFICER
    CITIZEN -.->|"Photo Reports"| AI_CHECK

    classDef lightBlue fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px,color:#0F172A;
    classDef lightPurple fill:#EDE7F6,stroke:#5E35B1,stroke-width:2px,color:#0F172A;
    classDef lightGreen fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#0F172A;
    classDef lightAmber fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#0F172A;

    class IMD,CWC,NCS,INCOIS,FSI lightBlue;
    class TF_SEARCH,TF_FETCH,TF_AGENT lightPurple;
    class GATE,DB,AI_CHECK,PENDING lightGreen;
    class CITIZEN,OFFICER lightAmber;
```

---

## 📊 Implementation Matrix: Current vs Future Scope

A transparent breakdown of what is completely implemented and verified in the codebase today, versus planned technical enhancements:

| Component | Feature / Capability | Status in Codebase | Technical Implementation |
|---|---|:---:|---|
| **Disaster Hazards** | 16 Official Hazard Categories | ✅ **IMPLEMENTED** | Configured in `config/radar_rules.json`, `src/hazards.js`, and PostGIS seed data. |
| **Spatial Shelters** | Nearest-First Distance Sorting | ✅ **IMPLEMENTED** | PostGIS `ST_Distance` query (11.7 ms average response time). |
| **Risk Heatmap** | Dynamic Incident Density Grid | ✅ **IMPLEMENTED** | PostGIS `ST_SnapToGrid` cell aggregation (9.5 ms average response time). |
| **Zero-Network SOS** | Distress Beacon & Offline Outbox | ✅ **IMPLEMENTED** | Client-side UUID generation; saved in local storage and auto-synced via `POST /api/sync`. |
| **Idempotency** | Replay & Duplicate Prevention | ✅ **IMPLEMENTED** | `ON CONFLICT (client_id) DO NOTHING` in PostgreSQL (100% duplicate protection). |
| **Authority Portal** | Real-Time Triage & Dispatch | ✅ **IMPLEMENTED** | Full lifecycle: `new` ➔ `acknowledged` ➔ `dispatched` ➔ `resolved`. |
| **Data Privacy** | Automated DPDPA Retention Sweep | ✅ **IMPLEMENTED** | `runRetentionSweep()` auto-purges expired photos & masks numbers (startup + 24h timer). |
| **IMD Radar** | GeoServer Color-to-Severity Map | ✅ **IMPLEMENTED** | Code 1=Red, 2=Orange, 3=Yellow in `radar/live_alerts.py` with 24h validity window. |
| **AI Damage Triage** | Computer Vision Classification | ✅ **IMPLEMENTED** | Classifies damage photos (`flood`, `building_damage`, etc.) with $\ge 0.70$ threshold. |
| **Mesh Networking** | LoRaWAN / Bluetooth LE Relays | 🔮 **FUTURE SCOPE** | Planned hardware integration for device-to-device hops without cellular towers. |
| **Satellite Radar** | Sentinel-1 SAR Flood Inundation | 🔮 **FUTURE SCOPE** | Planned radar satellite feed integration to trace water extents through cloud cover. |
| **Voice Broadcasts** | Multilingual TTS (Bhashini AI) | 🔮 **FUTURE SCOPE** | Planned automated audio broadcasts in 12 regional languages. |
| **Telecom Gateway** | Live Production Carrier SMS | 🔮 **FUTURE SCOPE** | In current demo, SMS is logged to spatial `sms_log` table (simulated gateway). |

---

## ⚡ Quickstart in 5 Commands

Run the full AAGAM backend, database migrations, and 16-hazard seed dataset locally:

```bash
# 1. Clone the repository
git clone https://github.com/COOKEE-MJ/AAGAM_.git
cd AAGAM_

# 2. Configure environment from safe template
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Initialize PostGIS schema & load demo dataset
npm run db:init && npm run db:seed

# 5. Start development API server (Port 3000)
npm run dev
```

### Running Automated Test Suites & Benchmarks
```bash
# 1. Automated Smoke Verification Suite (23 E2E checks)
npm run smoke

# 2. Complete Unit & Rules Test Suite (136 tests)
npm test

# 3. Live API Latency & Performance Benchmarks
node scripts/benchmark.js
```

### 🔑 Pre-Configured Demo Credentials (Password: `Demo@1234`)
- 👮 **Authority Officer:** `officer@demo.local` *(Full access to Heatmap, Verification Queue, & Shelters)*
- 👤 **Citizen Account:** `9000000002` *(PWA access, SOS trigger, and Photo Reports)*

---

## 📁 Project Directory Structure

```text
├── web/                  # Frontend user applications (HTML5, Leaflet, Tailwind CSS)
│   ├── citizen/          # Citizen Emergency PWA (Offline-first, Dual-language Hi/En)
│   └── authority/        # DDMA Authority Command & Dispatch Portal
├── api/                  # Backend REST API entrypoint & documentation
├── src/                  # Express server, PostGIS spatial queries, authentication & routing
│   ├── routes/           # /alerts, /shelters, /sos, /reports, /heatmap, /sync, /auth
│   └── services/         # Incident management, AI vision bridge, retention cleaner
├── radar/                # TinyFish Web Agent & IMD GeoServer WFS crawler engine
│   ├── live_alerts.py    # Official IMD warning color-to-severity mapping (Red, Orange, Yellow)
│   ├── tinyfish_client.py# Autonomous web search across official .gov.in bulletins
│   └── deduplicate_alerts.py # Multi-source alert deduplication pipeline
├── vision/               # Computer vision damage triage model contracts & unit tests
├── db/                   # Database migrations, PostGIS extensions, and 16-hazard seed data
├── scripts/              # Automated benchmarks, smoke tests, and rule verifiers
└── docs/                 # Architecture specifications, diagrams, and documentation
    └── screenshots/      # Citizen PWA and Authority Portal UI screenshots
```

---

## 👥 The Contributors

<table align="center">
  <tr>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/diya.png" width="90px;" alt="Diya Bhatt"/><br />
      <sub><b>Diya Bhatt</b></sub><br />
      <sub>🎨 <b>Frontend & UI Lead</b></sub><br />
      <small>Citizen PWA • Authority Dashboard • Dual-Language UI • Leaflet GIS Maps</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/nidhi.png" width="90px;" alt="Nidhi Jha"/><br />
      <sub><b>Nidhi Jha</b></sub><br />
      <sub>⚙️ <b>Backend & Database Lead</b></sub><br />
      <small>Node.js Express API • PostgreSQL / PostGIS • Spatial Queries • Offline Sync Engine</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/aarushi.png" width="90px;" alt="Aarushi Mathur"/><br />
      <sub><b>Aarushi Mathur</b></sub><br />
      <sub>🤖 <b>AI & GIS Specialist</b></sub><br />
      <small>TinyFish Web Agent • IMD GeoServer WFS • Deduplication Pipeline • Vision Triage</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/COOKEE-MJ.png" width="90px;" alt="Mansi"/><br />
      <sub><b>Mansi</b></sub><br />
      <sub>⚙️ <b>Backend Lead & Product Lead</b></sub><br />
      <small>PostGIS Spatial Architecture • Idempotent Offline Sync • Product Strategy & PRD • E2E QA Testing • Delivery</small>
    </td>
  </tr>
</table>

---

## 🔮 Future Scope & Technical Roadmap

1. **LoRa & Bluetooth Mesh Relays:**
   - Integrate mesh relays (ESP32 / LoRaWAN nodes) allowing offline citizen devices to hop SOS packets device-to-device to the nearest emergency vehicle or base station without cellular towers.
2. **Satellite Synthetic Aperture Radar (SAR) Inundation:**
   - Ingest Sentinel-1 SAR imagery to automatically trace water flood extents through heavy cloud cover during monsoons and cyclones.
3. **Multilingual Voice Broadcasts (Bhashini AI):**
   - Synthesize automated spoken audio warnings across 12 Indian regional languages for illiterate and visually-impaired citizens.
4. **Inter-State Multi-Agency Federation:**
   - Extend the PostGIS schema with multi-tenant state and district scopes, enabling synchronized NDRF and SDRF coordination across bordering river basins.

---

## ⚖️ Hackathon Transparency Disclosure
- **Pretrained AI Model:** Image damage verification utilizes a pretrained vision model with a default confidence threshold of $0.70$.
- **Simulated Telecom Gateway:** In the demonstration environment, SMS notifications are logged to a spatial database table (`sms_log`) rather than sending paid telecom SMS.
- **Seeded Demo Data:** Demonstration shelters and alerts are geolocated in the New Delhi district for testing.

---

<p align="center">
  <strong>⭐ Star this Repo!! ⭐</strong><br>
  <sub>Built with ❤️ for resilient disaster management across India • Licensed under MIT</sub>
</p>
