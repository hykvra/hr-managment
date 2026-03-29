-- Phase 6: Activity Logs table (idempotent) + Performance Reviews

-- ── Activity Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_slug TEXT,
  actor_id    UUID        REFERENCES employees(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role  TEXT,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  entity_name TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_ts
  ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON activity_logs(action);

-- ── Performance Reviews ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id        UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id        UUID          REFERENCES employees(id) ON DELETE SET NULL,
  review_period      TEXT          NOT NULL,
  period_start       DATE          NOT NULL,
  period_end         DATE          NOT NULL,
  overall_rating     NUMERIC(3,1)  CHECK (overall_rating BETWEEN 1 AND 5),
  attendance_rating  NUMERIC(3,1)  CHECK (attendance_rating BETWEEN 1 AND 5),
  performance_rating NUMERIC(3,1)  CHECK (performance_rating BETWEEN 1 AND 5),
  behavior_rating    NUMERIC(3,1)  CHECK (behavior_rating BETWEEN 1 AND 5),
  strengths          TEXT,
  improvements       TEXT,
  goals              TEXT,
  comments           TEXT,
  status             TEXT          NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','published')),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
