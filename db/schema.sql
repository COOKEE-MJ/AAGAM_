-- =====================================================================
-- AAGAM Spatial Database Schema (PostgreSQL 16 + PostGIS)
-- Multi-hazard emergency response, spatial indexing, offline sync & audit
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Hazard Catalogue (Supports 14 official Indian natural hazard types)
CREATE TABLE IF NOT EXISTS hazard_types (
  code           text PRIMARY KEY,
  label          text NOT NULL,
  category       text NOT NULL CHECK (category IN ('hydro-meteorological','geological','climatological','other')),
  default_advice text NOT NULL DEFAULT ''
);

-- 2. Users (Role-based access: Citizen vs Authority with district scope)
CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role                 text NOT NULL CHECK (role IN ('citizen','authority')),
  name                 text NOT NULL,
  email                text UNIQUE,
  phone                text UNIQUE NOT NULL,
  password_hash        text NOT NULL,
  home_district        text,
  home_state           text,
  district_scope       text,                 -- Authority users: strictly limits them to their designated district
  retention_expires_at timestamptz,          -- Privacy retention window for personal contact details
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_district_scope_idx ON users (district_scope);

-- 3. Alerts (Multi-hazard warnings with provenance & deduplication)
CREATE TABLE IF NOT EXISTS alerts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard               text NOT NULL REFERENCES hazard_types(code),
  severity             text NOT NULL CHECK (severity IN ('low','medium','high','extreme')),
  title                text NOT NULL,
  message              text NOT NULL DEFAULT '',
  district             text NOT NULL,
  state                text,
  center               geography(Point, 4326),   -- Optional center coordinate
  radius_km            numeric,                  -- Warning radius
  valid_from           timestamptz NOT NULL DEFAULT now(),
  valid_until          timestamptz,
  source_name          text NOT NULL,
  source_url           text NOT NULL,
  source_alert_id      text,                     -- Agency's unique alert ID (for matching updates/cancellations across days)
  source_published_at  timestamptz,              -- Timestamp when the source agency published it
  is_official_source   boolean NOT NULL DEFAULT false, -- Verified https .gov.in / .nic.in source
  extraction_status    text NOT NULL DEFAULT 'parsed_by_ai' CHECK (extraction_status IN ('official_feed','parsed_by_ai','manual')),
  review_reason        text,                     -- Reason if flagged as pending review
  reviewed_by          uuid REFERENCES users(id),
  reviewed_at          timestamptz,
  fetched_at           timestamptz NOT NULL DEFAULT now(),
  origin               text NOT NULL DEFAULT 'radar' CHECK (origin IN ('radar','manual','seed')),
  status               text NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending','withdrawn','expired')),
  dedupe_key           text UNIQUE,              -- hazard|district|source_host|day so re-scrapes update rather than duplicate
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_center_gix ON alerts USING gist (center);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts (status, district);
CREATE INDEX IF NOT EXISTS alerts_source_alert_id_idx ON alerts (source_alert_id);

-- 4. Shelters (Capacities, real-time occupancy & suitability)
CREATE TABLE IF NOT EXISTS shelters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'community hall',
  district     text NOT NULL,
  address      text,
  location     geography(Point, 4326) NOT NULL,
  capacity     int NOT NULL CHECK (capacity >= 0),
  occupancy    int NOT NULL DEFAULT 0 CHECK (occupancy >= 0),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filling','full','closed')),
  facilities   text[] NOT NULL DEFAULT '{}',
  suitable_for text[] NOT NULL DEFAULT '{}',  -- Hazard codes (e.g. {cyclone, flood})
  contact      text,
  source_name  text,
  source_url   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shelters_loc_gix ON shelters USING gist (location);
CREATE INDEX IF NOT EXISTS shelters_district_idx ON shelters (district);

-- 5. SOS Events (Idempotent citizen distress signals)
CREATE TABLE IF NOT EXISTS sos_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            text UNIQUE NOT NULL,     -- Client-generated UUID for retry idempotency
  user_id              uuid REFERENCES users(id),
  location             geography(Point, 4326) NOT NULL,
  hazard               text REFERENCES hazard_types(code),
  created_on_phone_at  timestamptz NOT NULL,
  received_at          timestamptz NOT NULL DEFAULT now(),
  people_count         int,
  injured              boolean NOT NULL DEFAULT false,
  note                 text,
  status               text NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','dispatched','resolved','cancelled','duplicate')),
  handled_by           uuid REFERENCES users(id),
  dispatch_note        text,
  retention_expires_at timestamptz,              -- Purge timestamp for sensitive citizen coordinates & notes
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sos_loc_gix ON sos_events USING gist (location);
CREATE INDEX IF NOT EXISTS sos_status_idx ON sos_events (status);

-- District scope and retention/redaction support. These ALTERs also upgrade existing databases.
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS redacted_at timestamptz;
ALTER TABLE sos_events ALTER COLUMN location DROP NOT NULL;
CREATE INDEX IF NOT EXISTS sos_district_status_idx ON sos_events (district, status);
UPDATE sos_events s SET district = u.home_district
  FROM users u WHERE s.user_id = u.id AND s.district IS NULL;
UPDATE sos_events SET retention_expires_at = received_at + interval '90 days'
  WHERE retention_expires_at IS NULL;

-- 6. Incident Reports (Crowdsourced damage photos with AI triage & review options)
CREATE TABLE IF NOT EXISTS reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             text UNIQUE NOT NULL,
  user_id               uuid REFERENCES users(id),
  location              geography(Point, 4326) NOT NULL,
  type                  text NOT NULL CHECK (type IN ('flooding','building_damage','road_blocked','landslide','fire','other')),
  hazard                text REFERENCES hazard_types(code),
  photo_data            text,                    -- Base64 or object storage reference
  note                  text,
  ai_label              text,
  ai_confidence         numeric,
  ai_mode               text,                    -- 'mock' or 'live'
  status                text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review','ai_verified','verified','rejected','needs_more_info')),
  reject_reason         text,
  officer_notes         text,                    -- Follow-up or clarifications from review officer
  possible_duplicate_of uuid REFERENCES reports(id), -- Flags clustering / duplicate reports
  reviewed_by           uuid REFERENCES users(id),
  reviewed_at           timestamptz,
  retention_expires_at  timestamptz,             -- Automated cleanup deadline for photo binaries
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_loc_gix ON reports USING gist (location);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS pii_retention_expires_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS redacted_at timestamptz;
ALTER TABLE reports ALTER COLUMN location DROP NOT NULL;
CREATE INDEX IF NOT EXISTS reports_district_status_idx ON reports (district, status);
UPDATE reports r SET district = u.home_district
  FROM users u WHERE r.user_id = u.id AND r.district IS NULL;
UPDATE reports SET retention_expires_at = created_at + interval '30 days'
  WHERE photo_data IS NOT NULL AND retention_expires_at IS NULL;
UPDATE reports SET pii_retention_expires_at = created_at + interval '90 days'
  WHERE pii_retention_expires_at IS NULL;
UPDATE users SET retention_expires_at = created_at + interval '90 days'
  WHERE role = 'citizen' AND retention_expires_at IS NULL;

-- 7. Mock SMS Gateway (Offline fallback logs)
CREATE TABLE IF NOT EXISTS sms_log (
  id          bigserial PRIMARY KEY,
  to_phone    text NOT NULL,
  body        text NOT NULL,
  mode        text NOT NULL DEFAULT 'mock',
  related_sos uuid REFERENCES sos_events(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 8. Radar Snapshots (Audit trail of raw fetched bulletins)
CREATE TABLE IF NOT EXISTS radar_snapshots (
  id         bigserial PRIMARY KEY,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw_text   text
);

-- 9. Officer Audit Log (Traceability for approvals, status changes & dispatches)
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES users(id),
  actor_role  text,
  action      text NOT NULL,                     -- e.g. 'alert.approve', 'report.verify', 'sos.dispatch'
  target_type text NOT NULL,                     -- 'alert', 'report', 'sos', 'shelter'
  target_id   text,
  detail      jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log (target_type, target_id);
