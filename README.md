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
  <a href="#-screen-by-screen-walkthrough">📱 Screens</a> •
  <a href="#-the-offline-sync-engine">📶 Offline Sync</a> •
  <a href="#-the-contributors">👥 Contributors</a>
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
    A["🛰️ 1. Hazard Radar<br/><b>(TinyFish Web Agent)</b>"] -->|"Extracts Bulletins"| B["⚙️ 2. Core PostGIS API<br/><b>(Node.js + PostgreSQL)</b>"]
    B <-->|"Pre-caches Alerts & Offline Sync"| C["📱 3. Citizen PWA<br/><b>(Offline-First Phone App)</b>"]
    B <-->|"Live Heatmap & Incident Queue"| D["🖥️ 4. DDMA Dashboard<br/><b>(District Command Center)</b>"]

    classDef lightBlue fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px,color:#0F172A;
    classDef lightGreen fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#0F172A;
    classDef lightAmber fill:#FFF8E1,stroke:#F57F17,stroke-width:2px,color:#0F172A;
    classDef lightRose fill:#FCE4EC,stroke:#C2185B,stroke-width:2px,color:#0F172A;

    class A lightBlue;
    class B lightGreen;
    class C lightAmber;
    class D lightRose;
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

| # | Rule | Core Principle & Technical Guarantee |
|:---:|---|---|
| **1** | **Prepare First, Connect Second** | Alerts, shelter lists, and map tiles are cached locally while online so they remain 100% accessible with zero cellular signal. |
| **2** | **Nothing Disappears Silently** | Every SOS and photo report displays a transparent status: `Queued` ➔ `Sent` ➔ `Acknowledged` ➔ `Dispatched` ➔ `Resolved`. |
| **3** | **AI Assists, Humans Decide** | Computer vision triage flags high-confidence damage ($\ge 0.70$). District officers retain full authority to approve or reject. |
| **4** | **Every Alert Proves Its Source** | Every warning displays official publication timestamps and direct links back to IMD, CWC, or NDMA source bulletins. |
| **5** | **Strict Privacy by Role** | Citizens never see other citizens' phone numbers or SOS coordinates. Officers only access data within their assigned district. |

---

## 🏗️ System Architecture

Data originates from authoritative government sources, passes through **TinyFish Web Agents**, normalizes into the **PostGIS** database, and syncs across citizen and command applications.

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
        DB[("🐘 PostgreSQL 16 + PostGIS\n- Spatial index ST_DWithin\n- Idempotent Sync & Heatmap")]
        AI_CHECK["👁️ AI Vision Check (Damage Classification)"]
        PENDING["📋 Pending Review Queue"]
        GATE -- "Yes (Auto-Publish)" --> DB
        GATE -- "News / Secondary" --> PENDING
        AI_CHECK --> DB
    end

    subgraph APPS["📱 Edge Applications"]
        direction LR
        CITIZEN["📱 Citizen PWA\n(IndexedDB + Service Worker)\nWorks 100% Offline"]
        OFFICER["🖥️ Authority Command Map\n(Real-Time Heatmap & Dispatch)"]
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
flowchart LR
    subgraph SOS["🆘 SOS Lifecycle"]
        direction LR
        S1["1. Queued Offline"] --> S2["2. New (Received)"]
        S2 --> S3["3. Acknowledged"]
        S3 --> S4["4. Dispatched"]
        S4 --> S5["5. Resolved"]
    end

    subgraph REP["📷 Photo Report Lifecycle"]
        direction LR
        R1["1. Queued on Phone"] --> R2["2. AI Vision Triage"]
        R2 -->|"Score >= 0.70"| R3["3. AI-Verified"]
        R2 -->|"Score < 0.70"| R4["3. Needs Review"]
        R4 -->|"Approved"| R5["4. Verified"]
        R4 -->|"Rejected"| R6["4. Rejected"]
    end

    classDef lightBlue fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px,color:#0F172A;
    classDef lightGreen fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#0F172A;

    class S1,S2,S3,S4,S5 lightBlue;
    class R1,R2,R3,R4,R5,R6 lightGreen;
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
      <img src="https://github.com/identicons/diya.png" width="90px;" alt="Diya Bhatt"/><br />
      <sub><b>Diya Bhatt</b></sub><br />
      <sub>🎨 <b>Frontend & UI Lead</b></sub><br />
      <small>React PWA • Service Worker • IndexedDB • Leaflet Maps</small>
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
      <small>TinyFish Web Agent • Vision Triage • Bulletin Extractor</small>
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

## ⚖️ Hackathon Transparency Disclosure
- **Pretrained AI Model:** Image damage verification utilizes a pretrained vision model with a default confidence threshold of $0.70$.
- **Simulated Telecom Gateway:** In the demonstration environment, SMS notifications are logged to a spatial database table (`sms_log`) rather than sending paid telecom SMS.
- **Seeded Demo Data:** Demonstration shelters and alerts are geolocated in the New Delhi district for testing.

---

<p align="center">
  <strong>⭐ Star this Repo!! ⭐</strong><br>
  <sub>Built with ❤️ for resilient disaster management across India • Licensed under MIT</sub>
</p>
