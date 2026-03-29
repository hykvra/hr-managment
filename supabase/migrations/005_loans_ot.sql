-- Phase 3: Loan Management + Overtime Pay

-- ── Employee Loans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_loans (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id   UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  reason        TEXT          NOT NULL,
  emi_amount    NUMERIC(12,2) NOT NULL,
  disbursed_on  DATE          NOT NULL DEFAULT CURRENT_DATE,
  months_total  INTEGER       NOT NULL,
  months_paid   INTEGER       NOT NULL DEFAULT 0,
  status        TEXT          NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'cleared', 'cancelled')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Loan Payment Log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_payments (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id      UUID          NOT NULL REFERENCES employee_loans(id) ON DELETE CASCADE,
  tenant_id    UUID          NOT NULL,
  employee_id  UUID          NOT NULL,
  month        DATE          NOT NULL,   -- YYYY-MM-01
  amount       NUMERIC(12,2) NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(loan_id, month)
);

-- ── Payroll Overtime + Loan Deduction columns ────────────────────────────────
ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS ot_hours        NUMERIC(6,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0;
