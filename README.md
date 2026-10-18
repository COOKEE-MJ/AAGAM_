<h1 align="center">🛡️ AAGAM (आगम)</h1>

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
  <img alt="hazards" src="https://img.shields.io/badge/11_Disaster_Types-🌋_🌊_🌀-red?style=flat-square">
  <img alt="offline" src="https://img.shields.io/badge/Zero--Network_SOS-📱-blue?style=flat-square">
  <img alt="ai" src="https://img.shields.io/badge/AI_Vision_Triage-🤖-green?style=flat-square">
  <img alt="spatial" src="https://img.shields.io/badge/Sub--50ms_PostGIS_Heatmap-🗺️-yellow?style=flat-square">
  <img alt="tests" src="https://img.shields.io/badge/Tests-23_Smoke_%7C_16_Unit_Passing-brightgreen?style=flat-square">
</p>

<p align="center">
  <a href="#-quickstart-in-5-commands">⚡ Quickstart</a> •
  <a href="#-aagam-in-one-minute">📖 1-Minute Overview</a> •
  <a href="#-system-architecture">🏗️ Architecture</a> •
  <a href="#-three-core-user-stories">🔁 Core Stories</a> •
  <a href="#-screen-by-screen-walkthrough">📱 Screens</a> •
  <a href="#-the-offline-sync-engine">📶 Offline Sync</a> •
  <a href="#-the-team">👥 Contributors</a>
</p>

---

<p align="center">
  <img src="docs/screenshots/hero-banner.png" alt="AAGAM Hero Banner Mockup" width="100%" />
</p>

> ### 📸 **[IMAGE PLACEHOLDER: HERO SHOWCASE BANNER]**
> - **File:** `docs/screenshots/hero-banner.png` (1200 × 600 px)
> - **Content:** High-res split mockup. **Left:** Citizen Mobile PWA in emergency dark mode showing *"Offline SOS Queued"* with safe route to nearest shelter. **Right:** DDMA Authority Command Dashboard on desktop showing live PostGIS density heatmap of East Delhi.

---

## 📖 AAGAM in One Minute

**AAGAM** warns people about impending disasters, guides them to open shelters even when the internet is completely down, and gives district administration verified on-the-ground intelligence to direct rescue teams.

```mermaid
flowchart LR
    A["🛰️ 1. Hazard Radar\n(TinyFish Web Agent)"] -->|"Extracts Bulletins"| B["⚙️ 2. Core PostGIS API\n(Node.js + PostgreSQL)"]
    B <-->|"Pre-caches Alerts & Offline Sync"| C["📱 3. Citizen PWA\n(Offline-First Phone App)"]
    B <-->|"Live Heatmap & Incident Queue"| D["🖥️ 4. DDMA Dashboard\n(District Command Center)"]

    style A fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style B fill:#e0f2f1,stroke:#00897b,stroke-width:2px
    style C fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style D fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

### 👥 The Two Users of AAGAM

| Dimension | 📱 Citizen (Resident / Evacuee) | 🖥️ Authority Officer (DDMA / DEOC) |
|---|---|---|
| **Who** | Any resident of a vulnerable district | District Disaster Management Authority staff |
| **Device** | Smartphone browser (Zero-install PWA) | Laptop or desktop browser |
| **Account** | Instant setup: Name, Phone, Home District *(OTP mocked)* | Admin-seeded account tied to district (`authority` JWT role) |
| **Main Goal** | Know danger level, find safe shelter, trigger SOS | Monitor district heatmap, verify damage, dispatch NDRF |
| **Cost** | **Always Free** for every citizen | Subscribed by District Administration |

---

## ⚖️ Five Golden Product Rules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  1. PREPARE FIRST, CONNECT SECOND                                                      │
│     Alerts, shelters, and map tiles are saved to phone while online so they open with  │
│     zero signal.                                                                       │
│                                                                                        │
│  2. NOTHING DISAPPEARS SILENTLY                                                        │
│     Every SOS and photo report displays a deterministic state: Queued ➔ Sent ➔ Resolved│
│                                                                                        │
│  3. AI ASSISTS, HUMANS DECIDE                                                          │
│     Vision model scores damage photos (>=70% threshold). Officers approve or reject.   │
│                                                                                        │
│  4. EVERY ALERT PROVES ITS SOURCE                                                      │
│     All alerts display official publication timestamp and a direct link to the bulletin.│
│                                                                                        │
│  5. STRICT PRIVACY BY ROLE                                                             │
│     Citizens NEVER see other citizens' phone numbers or SOS locations.                 │
│     Officers only see data inside their assigned district.                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

Data originates from authoritative government sources, passes through **TinyFish Web Agents**, normalizes into the **PostGIS** database, and syncs across citizen and command applications.

```mermaid
flowchart TD
    subgraph WEB["🌐 THE LIVE WEB: Official Government Portals"]
        direction LR
        IMD["IMD (Cyclone & Rain)"]
        CWC["CWC (River Floods)"]
        NCS["NCS (Earthquakes)"]
        INCOIS["INCOIS (Tsunami)"]
        FSI["FSI (Forest Fires)"]
    end

    subgraph TINYFISH["🤖 TINYFISH WEB AGENT ENGINE"]
        direction TB
        TF_SEARCH["🔍 Search API (Discovers newest bulletins per district)"]
        TF_FETCH["📥 Fetch API (Extracts clean structured text from HTML/PDFs)"]
        TF_AGENT["🧠 Parsing Agent (Standardizes hazard, severity, geometry)"]
        TF_SEARCH --> TF_FETCH --> TF_AGENT
    end

    subgraph BACKEND["⚙️ SPATIAL BACKEND & VERIFICATION"]
        direction TB
        GATE{"Official .gov.in?"}
        DB[("🐘 PostgreSQL 16 + PostGIS\n- Spatial index (ST_DWithin)\n- Idempotent Sync & Heatmap")]
        AI_CHECK["👁️ AI Vision Check (Pretrained Damage Model)"]
        GATE -- "Yes" --> DB
        GATE -- "News/Unverified" --> PENDING["Pending Review Queue"]
        AI_CHECK --> DB
    end

    subgraph APPS["📱 EDGE APPLICATIONS"]
        direction LR
        CITIZEN["📱 Citizen PWA\n(IndexedDB + Service Worker)\nWorks 100% Offline"]
        OFFICER["🖥️ Authority Command Map\n(Real-time Heatmap & Dispatch)"]
    end

    WEB --> TINYFISH
    TF_AGENT --> GATE
    DB <-->|"JSON over HTTPS / Auto-Sync"| CITIZEN
    DB <-->|"Spatial WebSocket / Heatmap API"| OFFICER
    CITIZEN -.->|"Photo Reports"| AI_CHECK

    style WEB fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style TINYFISH fill:#ede7f6,stroke:#512da8,stroke-width:2px
    style BACKEND fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style APPS fill:#fff8e1,stroke:#f57f17,stroke-width:2px
```

---

## 🔁 Three Core User Stories

<p align="center">
  <img src="docs/screenshots/timeline-steps.png" alt="Disaster Timeline" width="100%" />
</p>

> ### 📸 **[IMAGE PLACEHOLDER: 3 STORIES WORKFLOW]**
> - **File:** `docs/screenshots/timeline-steps.png` (900 × 300 px)
> - **Content:** Visual step-by-step banner showing: (1) Official IMD Bulletin $\rightarrow$ (2) Offline SOS on Citizen Phone $\rightarrow$ (3) AI Photo Triage on Officer Screen.

### 📜 Story A: Official Bulletin ➔ Phone Alert
1. **Radar Timer:** TinyFish Search finds newest bulletins for the district every 15 minutes.
2. **Text Extraction:** TinyFish Fetch retrieves clean bulletin text and timestamps a raw snapshot.
3. **Deduplication:** Merges identical hazard + district + source updates into a single active alert.
4. **Publish Rule:** Official domains (`.gov.in`, `.nic.in`) **auto-publish** immediately. News items become `pending`.
5. **Offline Delivery:** Citizen's PWA caches the alert; if cellular towers drop, the last valid alert remains visible.

### 🆘 Story B: The Zero-Signal SOS
1. **Trigger:** Citizen holds the red SOS button for 2 seconds (with a 5-second accidental cancel countdown).
2. **Local Storage:** Phone captures GPS coordinates, timestamp, and creates a unique `clientId` (UUID) in **IndexedDB**.
3. **If Online:** Transmitted immediately to `POST /api/sos/trigger`.
4. **If Offline:** Stored securely in phone queue; attempts mock SMS fallback.
5. **Auto-Sync:** As soon as any network bar returns, PWA flushes queue via `POST /api/sync`.
6. **Dispatch:** Officer sees an alert card $\rightarrow$ clicks **Acknowledge** $\rightarrow$ clicks **Dispatch Team** $\rightarrow$ marks **Resolved**.

### 📸 Story C: AI-Verified Photo Damage Report
1. **Capture:** Citizen selects a hazard category (e.g., *Flooding*), takes a photo (compressed on-device to ~300 KB).
2. **Inference:** Backend passes photo to AI vision model which returns `{label, confidence}`.
3. **Automated Triage Rule:**
   - **Confidence $\ge 0.70$ + Matching Label:** Automatically marked `ai_verified` and projected on the officer's live heatmap.
   - **Confidence $< 0.70$:** Sent to `needs_review` queue to keep the heatmap free of hoaxes and memes.
4. **Human Authority Decision:** The officer reviews the photo and confirms with **Approve** or **Reject**.

---

## 📱 Screen-by-Screen Walkthrough

### 1. Citizen PWA (Mobile Phone)

<p align="center">
  <img src="docs/screenshots/citizen-offline-sos.png" alt="Citizen App Offline SOS Screen" width="60%" />
</p>

> ### 📸 **[IMAGE PLACEHOLDER: CITIZEN PWA SCREENSHOTS]**
> - **File:** `docs/screenshots/citizen-offline-sos.png` (800 × 500 px)
> - **Content:** Mobile screenshot in Airplane Mode: Amber banner *"Offline: Updated 14:02"*, center red SOS button, and *"Nearest Open Shelter: Thyagaraj Stadium (0.8 km)"*.

| Tab | Key UI Elements | Works Offline? |
|---|---|:---:|
| 🏠 **Home** | Status strip (*"Online"* / *"Offline"*), hazard alert cards with severity colors (Red/Orange/Yellow), *What To Do* checklist, *View Official Source* link. | **YES** |
| 🗺️ **Map** | GPS blue dot, shelter pins, danger zone polygon, **"Nearest Open Shelter"** button that draws a dashed cached route. | **YES** |
| 🆘 **SOS** | Big Red Button (hold 2s), status progress card (*Queued $\rightarrow$ Sent $\rightarrow$ Acknowledged $\rightarrow$ Dispatched*), *"I'm Safe / Cancel"* button, 112 dialer. | **YES** *(Queued)* |
| 📷 **Report** | Hazard category chips, camera capture (~300 KB), draggable location pin, note input, *My Reports* status tracker. | **YES** *(Queued)* |
| 👤 **Profile** | Home district selector, emergency phone number, **"Download Offline Area"** button, manual sync button. | **YES** |

---

### 2. Authority Command Dashboard (Desktop Laptop)

<p align="center">
  <img src="docs/screenshots/authority-dashboard.png" alt="Authority Command Dashboard" width="90%" />
</p>

> ### 📸 **[IMAGE PLACEHOLDER: AUTHORITY COMMAND DASHBOARD]**
> - **File:** `docs/screenshots/authority-dashboard.png` (1200 × 650 px)
> - **Content:** DEOC command screen: Left navigation menu, live PostGIS incident density heatmap of Delhi NCR, active SOS cards, and live shelter occupancy meters.

| Page | What the Officer Sees & Does |
|---|---|
| 🗺️ **Overview** | KPI tiles (*Active Alerts*, *Open SOS*, *Reports to Review*, *Shelter Capacity*), real-time PostGIS heatmap, time filter (1h, 6h, 24h), SOS cluster markers ($\ge 3$ within 500m). |
| 📢 **Alerts** | Bulletin management table: Approve & Publish pending alerts, edit alert message, withdraw expired alerts, view source link. |
| 🚨 **SOS Queue** | Chronological distress list: Inspect citizen contact, team assignment input, one-click **Acknowledge**, **Dispatch**, and **Resolve**. |
| 📸 **Reports** | Three triage tabs: **Needs Review**, **AI-Verified**, and **Rejected**. View photo, AI confidence bar, and verify or reject with reason. |
| 🏕️ **Shelters** | Shelter list + map: Capacity vs occupancy, quick `+ / -` occupancy toggles, Open/Closed switch. |

---

## 🏕️ Shelter Pin & Heatmap Logic

### Shelter Pin Colors
- 🟢 **Green (Open):** Space available ($< 80\%$ occupied).
- 🟡 **Amber (Filling):** High occupancy ($80\% - 99\%$).
- 🔴 **Red (Full):** $100\%$ capacity reached (PWA automatically diverts routing to next closest shelter).
- ⚪ **Grey (Closed):** Decommissioned or unsafe shelter.

### Heatmap Color Scale (Command Center Only)
- 🟡 **Yellow:** Low incident density (1–3 trusted reports).
- 🟠 **Orange:** Moderate incident density.
- 🔴 **Red:** Critical trouble spot — **direct rescue units here first**.

> 🔒 **Why Citizens Do Not See the Heatmap:** Showing raw distress clusters publicly could cause mass panic and compromises citizen privacy. Citizens receive clean, verified alert polygons and shelter paths.

---

## 📶 The Offline Sync Engine

How AAGAM ensures zero distress calls are dropped when mobile towers fail:

| Feature | Offline Availability | Technical Implementation |
|---|:---:|---|
| **Open Citizen App** | ✅ **YES** | Service Worker serves cached application shell. |
| **Read Active Alerts** | ✅ **YES** | Read from local storage with *"Last updated"* timestamp. |
| **View Shelter Map & Pins** | ✅ **YES** | Pre-cached for user's home district at setup. |
| **Route to Shelter** | ✅ **YES** | Pre-calculated straight/cached line to nearest open facility. |
| **GPS Geolocation** | ✅ **YES** | Hardware GPS operates independently of cellular data. |
| **Trigger SOS** | ✅ **YES** | Saved to **IndexedDB** with client UUID; auto-syncs on network return. |
| **Submit Damage Photo** | ✅ **YES** | Compressed locally and queued for batch upload. |
| **Receive NEW Alerts** | ⚠️ *Requires Signal* | Real-time push requires data connection; SMS fallback simulated. |

---

## 🔄 Status Life Cycles

```mermaid
stateDiagram-v2
    direction LR

    state "SOS Event" as SOS {
        Queued_Local --> New : Auto-Sync
        New --> Acknowledged : Officer Sees
        Acknowledged --> Dispatched : Team Sent
        Dispatched --> Resolved : Safe
    }

    state "Photo Report" as REP {
        Queued_Phone --> AI_Analysis : Sync
        AI_Analysis --> AI_Verified : Score >= 0.70
        AI_Analysis --> Needs_Review : Score < 0.70
        Needs_Review --> Verified : Officer OK
        Needs_Review --> Rejected : Spam / Hoax
    }
```

---

## ⚡ Quickstart in 5 Commands

Run the full AAGAM backend, database migrations, and 11-hazard seed dataset locally:

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

### Verify Everything Works (Automated Smoke Suite)
```bash
npm run smoke
```
*(Executes 23 automated end-to-end checks across PostGIS spatial queries, SOS idempotency, and role permissions).*

### 🔑 Pre-Configured Demo Credentials (Password: `Demo@1234`)
- 👮 **Authority Officer:** `9000000001` *(Full access to Heatmap, Verification Queue, & Shelters)*
- 👤 **Citizen Account:** `9000000002` *(PWA access, SOS trigger, and Photo Reports)*

---

## 🛡️ Security & Privacy Audit

| Security Item | Status | Guarantee |
|---|:---:|---|
| **Database & API Passwords** | 🔒 **PROTECTED** | Local `.env` is listed in `.gitignore` and has **NEVER** been committed to git history. |
| **Citizen PII** | 🔒 **ENCRYPTED** | Phone numbers and exact coordinates are accessible exclusively by authorized district officers. |
| **Role-Based Access (RBAC)** | 🔒 **ENFORCED** | Public users and citizens receive `403 Forbidden` if attempting to query command heatmaps or queues. |
| **Idempotency Safeguard** | 🔒 **VERIFIED** | Every SOS carries a unique `clientId`; duplicate network packets never trigger duplicate alerts. |

---

## 👥 The Contributors

<table align="center">
  <tr>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/m1.png" width="100px;" alt="M1"/><br />
      <sub><b>Member 1</b></sub><br />
      <sub>🎨 <b>Frontend & UI Lead</b></sub><br />
      <small>React PWA • Service Worker • IndexedDB • Leaflet Maps</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/COOKEE-MJ.png" width="100px;" alt="COOKEE-MJ"/><br />
      <sub><b>MANSI (M4 & M2)</b></sub><br />
      <sub>⚙️ <b>Backend & Product Lead</b></sub><br />
      <small>PostGIS • Express API • Architecture • QA • Documentation</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/m3.png" width="100px;" alt="M3"/><br />
      <sub><b>Member 3</b></sub><br />
      <sub>🤖 <b>AI & Radar Specialist</b></sub><br />
      <small>TinyFish Web Agent • Vision Triage • Bulletin Extractor</small>
    </td>
    <td align="center" width="25%">
      <img src="https://github.com/identicons/m2.png" width="100px;" alt="M2"/><br />
      <sub><b>Member 2</b></sub><br />
      <sub>🗄️ <b>Database Architect</b></sub><br />
      <small>Spatial Schema • PostGIS Migrations • Role Middleware</small>
    </td>
  </tr>
</table>

---

## ⚖️ Hackathon Transparency Disclosure
- **Pretrained AI Model:** Image damage verification utilizes a pretrained vision model with a default confidence threshold of $0.70$.
- **Simulated Telecom Gateway:** In the demonstration environment, SMS notifications are logged to a spatial database table (`sms_log`) rather than sending paid telecom SMS.
- **Seeded Demo Data:** Demonstration shelters and alerts are geolocated in the New Delhi district for testing.

---

<p align="center">
  <strong>⭐ If you find AAGAM interesting, please consider starring this repository! ⭐</strong><br>
  <sub>Built with ❤️ for resilient disaster management across India • Licensed under MIT</sub>
</p>
