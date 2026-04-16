-- ================================================================
-- Carbon Clarity Data Vault — PostgreSQL Schema
-- Audit-ready for Global Affairs Canada (GAC) compliance
-- Requires: PostgreSQL 14+ with uuid-ossp and pgcrypto extensions
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── ENUM types ──────────────────────────────────────────────────
CREATE TYPE verification_status AS ENUM ('hardened', 'flagged', 'pending', 'rejected');
CREATE TYPE payout_status       AS ENUM ('queued', 'initiated', 'confirmed', 'failed', 'refunded');
CREATE TYPE momo_provider       AS ENUM ('mtn', 'telecel', 'other');
CREATE TYPE action_type         AS ENUM ('firewood_avoidance', 'nutrition_meal', 'solar_drying', 'organic_fertilizer');

-- ── sites ───────────────────────────────────────────────────────
CREATE TABLE sites (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(120) NOT NULL,
  cooperative         VARCHAR(120) NOT NULL,
  region              VARCHAR(80)  NOT NULL DEFAULT 'Eastern',
  district            VARCHAR(80)  NOT NULL DEFAULT 'Akuapem North',
  centroid_lat        DECIMAL(10, 7) NOT NULL,
  centroid_lng        DECIMAL(10, 7) NOT NULL,
  geofence_radius_m   INTEGER NOT NULL DEFAULT 200,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sites_active ON sites (active);

-- ── participants ─────────────────────────────────────────────────
CREATE TABLE participants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name             VARCHAR(120) NOT NULL,
  phone_msisdn          VARCHAR(20)  UNIQUE NOT NULL,
  momo_provider         momo_provider NOT NULL DEFAULT 'mtn',
  momo_wallet_msisdn    VARCHAR(20)  NOT NULL,
  site_id               UUID NOT NULL REFERENCES sites(id),
  enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  total_points          INTEGER NOT NULL DEFAULT 0,
  total_payouts_ghs     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  researcher_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_site_id ON participants (site_id);
CREATE INDEX idx_participants_active  ON participants (active);

-- ── boards (each Visual Bridge board has a QR) ──────────────────
CREATE TABLE boards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_hmac_token   VARCHAR(64) UNIQUE NOT NULL,
  participant_id  UUID NOT NULL REFERENCES participants(id),
  site_id         UUID NOT NULL REFERENCES sites(id),
  action_type     action_type NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_boards_participant_id  ON boards (participant_id);
CREATE INDEX idx_boards_qr_hmac_token   ON boards (qr_hmac_token);

-- ── scans (core hardening table) ────────────────────────────────
CREATE TABLE scans (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id                  UUID NOT NULL REFERENCES boards(id),
  participant_id            UUID NOT NULL REFERENCES participants(id),
  site_id                   UUID NOT NULL REFERENCES sites(id),

  -- Triple-Factor raw data
  qr_hmac_received          VARCHAR(64) NOT NULL,
  scan_time_device          TIMESTAMPTZ NOT NULL,
  scan_time_server          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gps_lat                   DECIMAL(10, 7) NOT NULL,
  gps_lng                   DECIMAL(10, 7) NOT NULL,
  gps_accuracy_m            DECIMAL(8, 2),
  distance_from_centroid_m  DECIMAL(10, 2),
  photo_s3_key              VARCHAR(255),
  photo_sha256              VARCHAR(64),

  -- Triple-Factor verification results
  factor_qr_pass            BOOLEAN NOT NULL DEFAULT FALSE,
  factor_gps_pass           BOOLEAN NOT NULL DEFAULT FALSE,
  factor_time_pass          BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp_delta_seconds   INTEGER,

  -- Outcome
  status                    verification_status NOT NULL DEFAULT 'pending',
  verification_log          JSONB NOT NULL DEFAULT '{}',
  points_awarded            INTEGER NOT NULL DEFAULT 0,
  flagged_reason            TEXT,
  reviewed_by               UUID REFERENCES participants(id),
  reviewed_at               TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scans_participant_id  ON scans (participant_id);
CREATE INDEX idx_scans_site_id         ON scans (site_id);
CREATE INDEX idx_scans_status          ON scans (status);
CREATE INDEX idx_scans_created_at      ON scans (created_at DESC);
CREATE INDEX idx_scans_board_id        ON scans (board_id);

-- ── payouts ─────────────────────────────────────────────────────
CREATE TABLE payouts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id             UUID NOT NULL REFERENCES scans(id),
  participant_id      UUID NOT NULL REFERENCES participants(id),
  idempotency_key     VARCHAR(64) UNIQUE NOT NULL,
  provider            momo_provider NOT NULL,
  msisdn              VARCHAR(20) NOT NULL,
  amount_ghs          DECIMAL(10, 2) NOT NULL,
  status              payout_status NOT NULL DEFAULT 'queued',
  provider_reference  VARCHAR(120),
  initiated_at        TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_participant_id   ON payouts (participant_id);
CREATE INDEX idx_payouts_status           ON payouts (status);
CREATE INDEX idx_payouts_idempotency_key  ON payouts (idempotency_key);

-- ── nutrition_logs (Provost research data) ───────────────────────
CREATE TABLE nutrition_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id        UUID NOT NULL REFERENCES participants(id),
  scan_id               UUID REFERENCES scans(id),
  log_date              DATE NOT NULL,
  meal_description      TEXT,
  protein_g             DECIMAL(8, 2),
  kcal                  INTEGER,
  nutrition_score       DECIMAL(5, 2),
  dietary_diversity     INTEGER,
  researcher_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by           VARCHAR(120),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nutrition_logs_participant_id ON nutrition_logs (participant_id);
CREATE INDEX idx_nutrition_logs_log_date        ON nutrition_logs (log_date DESC);

-- ── audit_log ────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name    VARCHAR(64) NOT NULL,
  record_id     UUID,
  action        VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values    JSONB,
  new_values    JSONB,
  changed_by    VARCHAR(120),
  ip_address    INET,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_changed_at   ON audit_log (changed_at DESC);

-- ── Audit trigger function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Attach audit triggers ────────────────────────────────────────
CREATE TRIGGER audit_scans
  AFTER INSERT OR UPDATE OR DELETE ON scans
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_payouts
  AFTER INSERT OR UPDATE OR DELETE ON payouts
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_participants
  AFTER INSERT OR UPDATE OR DELETE ON participants
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_nutrition_logs
  AFTER INSERT OR UPDATE OR DELETE ON nutrition_logs
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ── updated_at auto-update function ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_participants
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER set_updated_at_sites
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER set_updated_at_payouts
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Seed data (development) ──────────────────────────────────────
INSERT INTO sites (name, cooperative, centroid_lat, centroid_lng, geofence_radius_m)
VALUES
  ('Berekuso Farm A', 'Berekuso Women''s Agri Cooperative', 5.7456, -0.3214, 200),
  ('Berekuso Farm B', 'Berekuso Women''s Agri Cooperative', 5.7489, -0.3198, 200),
  ('Tomato Co-op West', 'Nsawam Tomato Growers Association', 5.8021, -0.3567, 200);
