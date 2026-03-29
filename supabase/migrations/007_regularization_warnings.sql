-- Phase 5: Attendance Regularization + Warning Letters

-- ── Attendance Regularization Requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_regularizations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id      UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  current_status   TEXT,
  requested_status TEXT        NOT NULL
                     CHECK (requested_status IN ('Present','HalfDay','DoubleShift','Absent','ApprovedLeave')),
  reason           TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  manager_note     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Warning Letters ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warning_letters (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  issued_by     UUID        REFERENCES employees(id) ON DELETE SET NULL,
  warning_type  TEXT        NOT NULL
                  CHECK (warning_type IN ('verbal','written','final')),
  subject       TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  issued_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  acknowledged_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
