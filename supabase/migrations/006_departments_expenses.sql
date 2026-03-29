-- Phase 4: Departments + Expense Reimbursements

-- ── Departments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- ── Expense Requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_requests (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id      UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount           NUMERIC(12,2) NOT NULL,
  category         TEXT          NOT NULL
                     CHECK (category IN ('Travel','Food','Medical','Equipment','Accommodation','Other')),
  description      TEXT          NOT NULL,
  receipt_url      TEXT,
  status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  approved_amount  NUMERIC(12,2),
  manager_note     TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
