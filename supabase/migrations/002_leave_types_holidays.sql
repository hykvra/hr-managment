-- Phase 2A: Customisable Leave Types, Holiday Calendar, Employee Leave Balances

-- 1. Leave Types (per tenant)
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  annual_quota NUMERIC(5,1) NOT NULL DEFAULT 12,
  carry_forward_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_carry_forward NUMERIC(5,1) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- 2. Company Holidays (per tenant)
CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  UNIQUE(tenant_id, date)
);

-- 3. Employee Leave Balances (per type, per year)
CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL,
  year INT NOT NULL,
  opening_balance NUMERIC(5,1) NOT NULL DEFAULT 0,
  accrued NUMERIC(5,1) NOT NULL DEFAULT 0,
  used NUMERIC(5,1) NOT NULL DEFAULT 0,
  carry_forward NUMERIC(5,1) NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- 4. Drop hardcoded leave_type constraint (allow any string now)
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- 5. Seed default leave types helper function (called per tenant on onboarding)
-- Default types: Sick (12/yr), Casual (12/yr), Earned (15/yr, carry forward), Vacation (10/yr)
-- These are inserted by the app during company onboarding.
