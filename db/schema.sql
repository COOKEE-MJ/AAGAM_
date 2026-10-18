-- AAGAM schema (M2). Multi-hazard by design.
-- Locations use geography(Point, 4326): ST_MakePoint(lng, lat).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hazard catalogue. Add a row to support a new hazard; no code change needed.
-- Hazard list follows the natural hazards India's disaster-management bodies cover.
-- M4 / team: confirm the final list against ndma.gov.in before the deck is printed.
CREATE TABLE IF NOT EXISTS hazard_types (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  category    text NOT NULL CHECK (category IN ('hydro-meteorological','geological','climatological','other')),
  default_advice text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role          text NOT NULL CHECK (role IN ('citizen','authority')),
  name          text NOT NULL,
  email         text UNIQUE,
  phone         text UNIQUE,
  password_hash text NOT NULL,
  home_district text,
  home_state    text,
  district_scope text,                 -- authority users: the one district they manage
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard      text NOT NULL REFERENCES hazard_types(code),
  severity    text NOT NULL CHECK (severity IN ('low','medium','high','extreme')),
  title       text NOT NULL,
  message     text NOT NULL DEFAULT '',
  district    text NOT NULL,
  state       text,
  center      geography(Point, 4326),   -- optional; NULL = whole district
  radius_km   numeric,                  -- optional
  valid_from  timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  source_name text NOT NULL,
  source_url  text NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  origin      text NOT NULL DEFAULT 'radar' CHECK (origin IN ('radar','manual','seed')),
  status      text NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending','withdrawn','expired')),
  dedupe_key  text UNIQUE,              -- hazard+district+source+day, set by radar (M3) so reruns update, not duplicate
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_center_gix ON alerts USING gist (center);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts (status, district);

CREATE TABLE IF NOT EXISTS shelters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'community hall',
  district    text NOT NULL,
  address     text,
  location    geography(Point, 4326) NOT NULL,
  capacity    int NOT NULL CHECK (capacity >= 0),
  occupancy   int NOT NULL DEFAULT 0 CHECK (occupancy >= 0),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filling','full','closed')),
  facilities  text[] NOT NULL DEFAULT '{}',
  suitable_for text[] NOT NULL DEFAULT '{}',  -- hazard codes, e.g. {cyclone,flood}; earthquake = open assembly points
  contact     text,
  source_name text,
  source_url  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shelters_loc_gix ON shelters USING gist (location);

CREATE TABLE IF NOT EXISTS sos_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   text UNIQUE NOT NULL,          -- generated on the phone; makes retries idempotent
  user_id     uuid REFERENCES users(id),
  location    geography(Point, 4326) NOT NULL,
  hazard      text REFERENCES hazard_types(code),  -- optional: what the citizen is facing
  created_on_phone_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  people_count int,
  injured     boolean NOT NULL DEFAULT false,
  note        text,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','dispatched','resolved','cancelled','duplicate')),
  handled_by  uuid REFERENCES users(id),
  dispatch_note text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sos_loc_gix ON sos_events USING gist (location);

CREATE TABLE IF NOT EXISTS reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   text UNIQUE NOT NULL,
  user_id     uuid REFERENCES users(id),
  location    geography(Point, 4326) NOT NULL,
  type        text NOT NULL CHECK (type IN ('flooding','building_damage','road_blocked','landslide','fire','other')),
  hazard      text REFERENCES hazard_types(code),
  photo_data  text,                           -- small base64 data URL for the demo; swap for object storage later
  note        text,
  ai_label    text,
  ai_confidence numeric,
  ai_mode     text,                           -- 'mock' or 'live' so the README can be honest
  status      text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review','ai_verified','verified','rejected')),
  reject_reason text,
  reviewed_by uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_loc_gix ON reports USING gist (location);

-- Mock SMS gateway: nothing is sent, rows are the proof for the demo.
CREATE TABLE IF NOT EXISTS sms_log (
  id         bigserial PRIMARY KEY,
  to_phone   text NOT NULL,
  body       text NOT NULL,
  mode       text NOT NULL DEFAULT 'mock',
  related_sos uuid REFERENCES sos_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Raw TinyFish responses can be stored here by M3 (optional; files in radar/snapshots also fine).
CREATE TABLE IF NOT EXISTS radar_snapshots (
  id         bigserial PRIMARY KEY,
  source_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw_text   text
);
