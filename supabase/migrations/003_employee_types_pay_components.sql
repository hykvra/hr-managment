-- Phase 2B: Employee Types, Departments, PF/ESI, Variable Pay Components, Documents

-- 1. New columns on employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'regular'
  CHECK (employment_type IN ('regular', 'contractual', 'daily_wage'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pf_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pf_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_number TEXT;

-- 2. Variable pay components per employee (HRA, TA, Medical allowance, etc.)
CREATE TABLE IF NOT EXISTS employee_pay_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('allowance', 'deduction')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, component_name)
);

-- 3. New columns on payroll_records for PF/ESI + component totals
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS total_allowances NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS total_component_deductions NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS pf_employee NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS pf_employer NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS esi_employee NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS esi_employer NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 4. Documents table improvements
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL;
