-- ESAM HR Portal — Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL,
  blood_group TEXT,
  employee_code TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('master_admin','manager','attendance','employee')),
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  leave_balance NUMERIC(5,1) NOT NULL DEFAULT 0,
  monthly_leave_quota NUMERIC(5,1) NOT NULL DEFAULT 1.5,
  profile_photo TEXT,
  original_photo TEXT,
  bank_name TEXT,
  account_no TEXT,
  ifsc TEXT,
  branch_name TEXT,
  account_holder TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  resignation_status BOOLEAN NOT NULL DEFAULT FALSE,
  resignation_date DATE,
  last_working_date DATE,
  increment_message TEXT,
  bonus_message TEXT,
  total_penalties NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  first_login BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP Store (in-memory substitute using DB for forgot password)
CREATE TABLE otp_store (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  end_date DATE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Sick','Casual','Earned','Vacation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  manager_comment TEXT,
  exception_flag BOOLEAN NOT NULL DEFAULT FALSE,
  group_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Advances
CREATE TABLE salary_advances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  manager_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present','Absent','HalfDay','Uninformed','DoubleShift','ApprovedLeave')),
  UNIQUE(employee_id, date)
);

-- Salary History
CREATE TABLE salary_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  old_salary NUMERIC(12,2) NOT NULL,
  new_salary NUMERIC(12,2) NOT NULL,
  start_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus History
CREATE TABLE bonus_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  bonus_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  manager_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  target_shift TEXT NOT NULL DEFAULT 'All',
  created_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Permissions
CREATE TABLE admin_permissions (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  can_approve_leaves BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_salary BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_reports BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_shifts BOOLEAN NOT NULL DEFAULT FALSE,
  can_send_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on employees
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default company settings
INSERT INTO company_settings (setting_key, setting_value) VALUES
  ('max_leaves_per_day', '3'),
  ('advance_max_percent', '50'),
  ('penalty_multiplier', '2');
