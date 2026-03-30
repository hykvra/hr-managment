-- Phase 7: Hikvision DS-K1T343MX Integration

-- ── Device configuration (one per office/location per tenant) ─────────────────
CREATE TABLE IF NOT EXISTS hikvision_devices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_name     TEXT        NOT NULL DEFAULT 'Office Terminal',
  ip_address      TEXT        NOT NULL,
  port            INT         NOT NULL DEFAULT 80,
  username        TEXT        NOT NULL DEFAULT 'admin',
  password_enc    TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  push_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  last_sync_at    TIMESTAMPTZ,
  last_event_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, ip_address)
);

-- ── Employee ↔ device user mapping ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hikvision_user_mapping (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id       UUID        NOT NULL REFERENCES hikvision_devices(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  hik_employee_no TEXT        NOT NULL,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, hik_employee_no),
  UNIQUE(device_id, employee_id)
);

-- ── Raw event log (all events from device, processed or not) ─────────────────
CREATE TABLE IF NOT EXISTS hikvision_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id        UUID        REFERENCES hikvision_devices(id) ON DELETE SET NULL,
  hik_employee_no  TEXT,
  employee_id      UUID        REFERENCES employees(id) ON DELETE SET NULL,
  event_time       TIMESTAMPTZ NOT NULL,
  attendance_status TEXT,
  verify_mode      TEXT,
  card_no          TEXT,
  employee_name    TEXT,
  processed        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hik_events_tenant_time
  ON hikvision_events(tenant_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_hik_events_employee
  ON hikvision_events(employee_id, event_time DESC);
