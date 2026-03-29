/**
 * ESAM HR Portal — Demo Seed Script
 * Run: npx tsx scripts/seed.ts
 *
 * Creates a fully-populated demo workspace for the tenant slug "esam".
 * All demo accounts use password:  Demo@1234
 *
 * Safe to re-run — clears all seeded data for the tenant before re-inserting.
 */

import { createClient } from '@supabase/supabase-js'
import * as bcryptjs from 'bcryptjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs

// ─── Supabase client (uses same env vars as the app) ─────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEMO_PASSWORD = 'Demo@1234'
const TENANT_SLUG   = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'
const TODAY         = new Date('2026-03-29')

function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function monthStart(offset: number): string {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + offset, 1)
  return d.toISOString().split('T')[0]
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Step 1: Resolve or create tenant ────────────────────────────────────────
async function resolveTenant(): Promise<string> {
  const { data } = await db.from('tenants').select('id').eq('slug', TENANT_SLUG).maybeSingle()
  if (data?.id) {
    console.log(`✓ Using existing tenant: ${TENANT_SLUG} (${data.id})`)
    return data.id
  }

  const trialEndsAt = new Date(TODAY)
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)

  const { data: newTenant, error } = await db.from('tenants').insert({
    slug: TENANT_SLUG,
    company_name: 'ESAM Technologies',
    plan: 'pro',
    status: 'active',
    max_employees: 100,
    trial_ends_at: trialEndsAt.toISOString(),
  }).select('id').single()

  if (error || !newTenant) throw new Error(`Failed to create tenant: ${error?.message}`)
  console.log(`✓ Created tenant: ${TENANT_SLUG} (${newTenant.id})`)
  return newTenant.id
}

// ─── Step 2: Clear existing seeded data (order matters for FK constraints) ───
async function clearTenantData(tenantId: string) {
  console.log('🗑  Clearing existing data for tenant…')
  // Clear in reverse dependency order
  const tables = [
    'activity_logs', 'performance_reviews', 'warning_letters',
    'attendance_regularizations', 'expense_requests', 'loan_payments',
    'employee_loans', 'employee_pay_components', 'employee_leave_balances',
    'payroll_records', 'bonus_history', 'salary_history', 'broadcasts',
    'support_tickets', 'salary_advances', 'leave_requests',
    'attendance', 'documents', 'admin_permissions',
    'company_holidays', 'leave_types', 'departments', 'company_settings',
  ]
  for (const t of tables) {
    const col = t === 'company_settings' ? 'setting_key' : 'tenant_id'
    if (t === 'company_settings') {
      // company_settings may not have tenant_id in old schema — just truncate safe rows
      await db.from('company_settings').delete().neq('setting_key', '__none__')
    } else {
      await db.from(t).delete().eq('tenant_id', tenantId)
    }
  }
  // Delete non-admin employees (keep if tenant already had some)
  await db.from('employees').delete().eq('tenant_id', tenantId)
  console.log('✓ Cleared')
}

// ─── Main seed ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  ESAM HR Seed — tenant: "${TENANT_SLUG}"\n`)

  const tenantId = await resolveTenant()
  await clearTenantData(tenantId)

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10)
  console.log(`✓ Password hash ready (all accounts: ${DEMO_PASSWORD})`)

  // ── Shifts ─────────────────────────────────────────────────────────────────
  const { data: shifts } = await db.from('shifts').insert([
    { name: 'Morning',  start_time: '09:00', end_time: '18:00' },
    { name: 'Evening',  start_time: '14:00', end_time: '22:00' },
    { name: 'Night',    start_time: '22:00', end_time: '06:00' },
  ]).select('id, name')
  if (!shifts) throw new Error('Failed to insert shifts')
  const shiftMap = Object.fromEntries(shifts.map(s => [s.name, s.id])) as Record<string, string>
  console.log(`✓ Shifts: ${shifts.map(s => s.name).join(', ')}`)

  // ── Departments ────────────────────────────────────────────────────────────
  const { data: depts } = await db.from('departments').insert([
    { tenant_id: tenantId, name: 'Engineering',  description: 'Product & software development' },
    { tenant_id: tenantId, name: 'Marketing',    description: 'Brand, content & growth' },
    { tenant_id: tenantId, name: 'Sales',        description: 'Business development & revenue' },
    { tenant_id: tenantId, name: 'HR',           description: 'People operations' },
    { tenant_id: tenantId, name: 'Finance',      description: 'Accounting & financial planning' },
  ]).select('id, name')
  if (!depts) throw new Error('Failed to insert departments')
  console.log(`✓ Departments: ${depts.map(d => d.name).join(', ')}`)

  // ── Company Settings ───────────────────────────────────────────────────────
  // company_settings is keyed by tenant_id + setting_key
  const { error: csErr } = await db.from('company_settings').insert([
    { tenant_id: tenantId, setting_key: 'brand_name',          setting_value: 'ESAM Technologies' },
    { tenant_id: tenantId, setting_key: 'brand_color',         setting_value: '#2563eb' },
    { tenant_id: tenantId, setting_key: 'brand_initials',      setting_value: 'ET' },
    { tenant_id: tenantId, setting_key: 'max_leaves_per_day',  setting_value: '3' },
    { tenant_id: tenantId, setting_key: 'advance_max_percent', setting_value: '50' },
    { tenant_id: tenantId, setting_key: 'penalty_multiplier',  setting_value: '2' },
  ])
  if (csErr) console.warn('  ⚠️  company_settings:', csErr.message)
  else console.log('✓ Company settings')

  // ── Leave Types ────────────────────────────────────────────────────────────
  const { data: leaveTypes, error: ltErr } = await db.from('leave_types').insert([
    { tenant_id: tenantId, name: 'Sick',     annual_quota: 12, color: '#ef4444', carry_forward_enabled: false, max_carry_forward: 0 },
    { tenant_id: tenantId, name: 'Casual',   annual_quota: 12, color: '#f59e0b', carry_forward_enabled: false, max_carry_forward: 0 },
    { tenant_id: tenantId, name: 'Earned',   annual_quota: 15, color: '#10b981', carry_forward_enabled: true,  max_carry_forward: 10 },
    { tenant_id: tenantId, name: 'Vacation', annual_quota: 10, color: '#6366f1', carry_forward_enabled: false, max_carry_forward: 0 },
  ]).select('id, name, annual_quota')
  if (ltErr || !leaveTypes) throw new Error(`Failed to insert leave types: ${ltErr?.message ?? 'null data'}`)
  const ltMap = Object.fromEntries(leaveTypes.map(l => [l.name, l.id])) as Record<string, string>
  console.log(`✓ Leave types: ${leaveTypes.map(l => l.name).join(', ')}`)

  // ── Holidays 2026 ──────────────────────────────────────────────────────────
  await db.from('company_holidays').insert([
    { tenant_id: tenantId, name: 'Republic Day',           date: '2026-01-26' },
    { tenant_id: tenantId, name: 'Holi',                   date: '2026-03-05' },
    { tenant_id: tenantId, name: 'Good Friday',            date: '2026-04-03' },
    { tenant_id: tenantId, name: 'Ambedkar Jayanti',       date: '2026-04-14' },
    { tenant_id: tenantId, name: 'Maharashtra Day',        date: '2026-05-01' },
    { tenant_id: tenantId, name: 'Independence Day',       date: '2026-08-15' },
    { tenant_id: tenantId, name: 'Ganesh Chaturthi',       date: '2026-08-23' },
    { tenant_id: tenantId, name: 'Gandhi Jayanti',         date: '2026-10-02' },
    { tenant_id: tenantId, name: 'Diwali',                 date: '2026-10-29' },
    { tenant_id: tenantId, name: 'Diwali (Padwa)',         date: '2026-10-30' },
    { tenant_id: tenantId, name: 'Christmas',              date: '2026-12-25' },
  ])
  console.log('✓ 11 holidays for 2026')

  // ── Employees ──────────────────────────────────────────────────────────────
  type EmpRow = {
    tenant_id: string; first_name: string; last_name: string; email: string
    password_hash: string; mobile: string; address: string; dob: string
    gender: string; blood_group?: string; role: string; is_active: boolean
    first_login: boolean; employee_code: string; shift_id: string
    joining_date: string; base_salary: number; leave_balance: number
    department?: string; employment_type: string; pf_enabled: boolean; esi_enabled: boolean
  }

  const empRows: EmpRow[] = [
    // ─ Admin
    {
      tenant_id: tenantId, first_name: 'Raj', last_name: 'Kanani',
      email: 'admin@esam.in', password_hash: hash, mobile: '9876543210',
      address: '101 Admin Tower, Mumbai', dob: '1985-06-15', gender: 'Male',
      blood_group: 'O+', role: 'master_admin', is_active: true, first_login: false,
      employee_code: 'ADM001', shift_id: shiftMap['Morning'],
      joining_date: '2023-01-01', base_salary: 120000, leave_balance: 14,
      department: 'HR', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    // ─ Manager
    {
      tenant_id: tenantId, first_name: 'Priya', last_name: 'Sharma',
      email: 'manager@esam.in', password_hash: hash, mobile: '9876500001',
      address: '202 Manager Lane, Pune', dob: '1990-03-22', gender: 'Female',
      blood_group: 'A+', role: 'manager', is_active: true, first_login: false,
      employee_code: 'MGR001', shift_id: shiftMap['Morning'],
      joining_date: '2023-03-15', base_salary: 95000, leave_balance: 11,
      department: 'Engineering', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    // ─ Attendance role
    {
      tenant_id: tenantId, first_name: 'Rahul', last_name: 'Verma',
      email: 'attendance@esam.in', password_hash: hash, mobile: '9876500002',
      address: '303 Staff Quarters, Nashik', dob: '1993-11-08', gender: 'Male',
      role: 'attendance', is_active: true, first_login: false,
      employee_code: 'ATD001', shift_id: shiftMap['Morning'],
      joining_date: '2023-06-01', base_salary: 40000, leave_balance: 10,
      department: 'HR', employment_type: 'regular', pf_enabled: true, esi_enabled: true,
    },
    // ─ Regular employees
    {
      tenant_id: tenantId, first_name: 'Aisha', last_name: 'Khan',
      email: 'aisha.khan@esam.in', password_hash: hash, mobile: '9876500003',
      address: '12 Rose Apartments, Mumbai', dob: '1995-07-14', gender: 'Female',
      blood_group: 'B+', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP001', shift_id: shiftMap['Morning'],
      joining_date: '2023-04-01', base_salary: 75000, leave_balance: 9,
      department: 'Engineering', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    {
      tenant_id: tenantId, first_name: 'Vikram', last_name: 'Singh',
      email: 'vikram.singh@esam.in', password_hash: hash, mobile: '9876500004',
      address: '45 Brigade Road, Bangalore', dob: '1992-12-30', gender: 'Male',
      blood_group: 'O-', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP002', shift_id: shiftMap['Morning'],
      joining_date: '2023-05-15', base_salary: 82000, leave_balance: 12,
      department: 'Engineering', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    {
      tenant_id: tenantId, first_name: 'Sneha', last_name: 'Patel',
      email: 'sneha.patel@esam.in', password_hash: hash, mobile: '9876500005',
      address: '78 Satellite, Ahmedabad', dob: '1996-02-19', gender: 'Female',
      blood_group: 'AB+', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP003', shift_id: shiftMap['Morning'],
      joining_date: '2023-08-01', base_salary: 60000, leave_balance: 8,
      department: 'Marketing', employment_type: 'regular', pf_enabled: false, esi_enabled: true,
    },
    {
      tenant_id: tenantId, first_name: 'Arjun', last_name: 'Nair',
      email: 'arjun.nair@esam.in', password_hash: hash, mobile: '9876500006',
      address: '90 MG Road, Kochi', dob: '1991-09-05', gender: 'Male',
      blood_group: 'A-', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP004', shift_id: shiftMap['Evening'],
      joining_date: '2023-07-10', base_salary: 70000, leave_balance: 10,
      department: 'Sales', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    {
      tenant_id: tenantId, first_name: 'Deepa', last_name: 'Menon',
      email: 'deepa.menon@esam.in', password_hash: hash, mobile: '9876500007',
      address: '15 Anna Nagar, Chennai', dob: '1994-04-28', gender: 'Female',
      blood_group: 'B-', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP005', shift_id: shiftMap['Morning'],
      joining_date: '2023-09-01', base_salary: 55000, leave_balance: 11,
      department: 'HR', employment_type: 'regular', pf_enabled: true, esi_enabled: true,
    },
    {
      tenant_id: tenantId, first_name: 'Rohit', last_name: 'Gupta',
      email: 'rohit.gupta@esam.in', password_hash: hash, mobile: '9876500008',
      address: '60 Hauz Khas, New Delhi', dob: '1989-01-17', gender: 'Male',
      blood_group: 'O+', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP006', shift_id: shiftMap['Morning'],
      joining_date: '2023-02-01', base_salary: 90000, leave_balance: 13,
      department: 'Finance', employment_type: 'regular', pf_enabled: true, esi_enabled: false,
    },
    {
      tenant_id: tenantId, first_name: 'Neha', last_name: 'Joshi',
      email: 'neha.joshi@esam.in', password_hash: hash, mobile: '9876500009',
      address: '22 Camp, Pune', dob: '1997-08-11', gender: 'Female',
      blood_group: 'A+', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP007', shift_id: shiftMap['Morning'],
      joining_date: '2024-01-15', base_salary: 65000, leave_balance: 7,
      department: 'Engineering', employment_type: 'regular', pf_enabled: false, esi_enabled: true,
    },
    {
      tenant_id: tenantId, first_name: 'Ankit', last_name: 'Sharma',
      email: 'ankit.sharma@esam.in', password_hash: hash, mobile: '9876500010',
      address: '33 Jodhpur Park, Kolkata', dob: '1993-05-23', gender: 'Male',
      role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP008', shift_id: shiftMap['Evening'],
      joining_date: '2024-03-01', base_salary: 58000, leave_balance: 6,
      department: 'Marketing', employment_type: 'regular', pf_enabled: false, esi_enabled: false,
    },
    {
      tenant_id: tenantId, first_name: 'Kavya', last_name: 'Reddy',
      email: 'kavya.reddy@esam.in', password_hash: hash, mobile: '9876500011',
      address: '7 Banjara Hills, Hyderabad', dob: '1998-10-03', gender: 'Female',
      blood_group: 'AB-', role: 'employee', is_active: true, first_login: false,
      employee_code: 'EMP009', shift_id: shiftMap['Evening'],
      joining_date: '2024-06-01', base_salary: 52000, leave_balance: 5,
      department: 'Sales', employment_type: 'contractual', pf_enabled: false, esi_enabled: true,
    },
  ]

  const { data: employees, error: empErr } = await db.from('employees').insert(empRows).select('id, email, role, base_salary, dob')
  if (empErr || !employees) throw new Error(`Failed to insert employees: ${empErr?.message}`)
  const empByEmail = Object.fromEntries(employees.map(e => [e.email, e])) as Record<string, { id: string; email: string; role: string; base_salary: number; dob: string }>
  const empIds = employees.filter(e => e.role === 'employee').map(e => e.id)
  console.log(`✓ ${employees.length} employees inserted`)

  // ── Admin Permissions (for manager) ───────────────────────────────────────
  const managerId = empByEmail['manager@esam.in'].id
  await db.from('admin_permissions').insert({
    employee_id: managerId,
    can_approve_leaves: true,
    can_manage_salary: true,
    can_view_reports: true,
    can_manage_shifts: true,
    can_send_broadcast: true,
  })
  console.log('✓ Manager permissions set')

  // ── Pay Components ──────────────────────────────────────────────────────────
  const payComps = []
  for (const emp of employees.filter(e => e.role === 'employee' || e.role === 'manager')) {
    payComps.push(
      { tenant_id: tenantId, employee_id: emp.id, component_name: 'HRA',              component_type: 'allowance', amount: Math.round(emp.base_salary * 0.4), is_percentage: false },
      { tenant_id: tenantId, employee_id: emp.id, component_name: 'Transport',         component_type: 'allowance', amount: 3000, is_percentage: false },
      { tenant_id: tenantId, employee_id: emp.id, component_name: 'Medical Allowance', component_type: 'allowance', amount: 1250, is_percentage: false },
    )
    if (emp.base_salary > 70000) {
      payComps.push({ tenant_id: tenantId, employee_id: emp.id, component_name: 'Professional Tax', component_type: 'deduction', amount: 200, is_percentage: false })
    }
  }
  await db.from('employee_pay_components').insert(payComps)
  console.log(`✓ ${payComps.length} pay components`)

  // ── Salary History ──────────────────────────────────────────────────────────
  await db.from('salary_history').insert([
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    old_salary: 65000, new_salary: 75000, start_month: '2025-10-01' },
    { tenant_id: tenantId, employee_id: empByEmail['vikram.singh@esam.in'].id,  old_salary: 72000, new_salary: 82000, start_month: '2025-10-01' },
    { tenant_id: tenantId, employee_id: empByEmail['rohit.gupta@esam.in'].id,   old_salary: 80000, new_salary: 90000, start_month: '2025-12-01' },
    { tenant_id: tenantId, employee_id: empByEmail['manager@esam.in'].id,       old_salary: 85000, new_salary: 95000, start_month: '2025-10-01' },
  ])
  console.log('✓ Salary history')

  // ── Bonus History ───────────────────────────────────────────────────────────
  await db.from('bonus_history').insert([
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    amount: 15000, reason: 'Q3 Performance Bonus',   bonus_month: '2025-09-01' },
    { tenant_id: tenantId, employee_id: empByEmail['vikram.singh@esam.in'].id,  amount: 20000, reason: 'Project Delivery Bonus', bonus_month: '2025-11-01' },
    { tenant_id: tenantId, employee_id: empByEmail['arjun.nair@esam.in'].id,    amount: 25000, reason: 'Sales Target Achieved',  bonus_month: '2025-12-01' },
    { tenant_id: tenantId, employee_id: empByEmail['rohit.gupta@esam.in'].id,   amount: 10000, reason: 'Annual Appraisal Bonus', bonus_month: '2025-12-01' },
    { tenant_id: tenantId, employee_id: empByEmail['sneha.patel@esam.in'].id,   amount: 8000,  reason: 'Campaign Success Bonus', bonus_month: '2026-01-01' },
  ])
  console.log('✓ Bonus history')

  // ── Attendance (last 90 days for each employee) ────────────────────────────
  const attendanceRows: { tenant_id: string; employee_id: string; date: string; status: string }[] = []
  const STATUSES = ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'HalfDay', 'Absent', 'DoubleShift']

  for (const emp of employees) {
    for (let i = 1; i <= 90; i++) {
      const date = daysAgo(i)
      const d = new Date(date)
      const dow = d.getDay()
      if (dow === 0) continue // skip Sundays

      // Simulate realistic attendance
      let status: string
      if (dow === 6) {
        status = Math.random() > 0.3 ? 'Present' : 'Absent'
      } else {
        status = rand(STATUSES)
      }

      attendanceRows.push({ tenant_id: tenantId, employee_id: emp.id, date, status })
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < attendanceRows.length; i += 500) {
    await db.from('attendance').insert(attendanceRows.slice(i, i + 500))
  }
  console.log(`✓ ${attendanceRows.length} attendance records`)

  // ── Leave Requests ──────────────────────────────────────────────────────────
  await db.from('leave_requests').insert([
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    leave_type: 'Sick',     leave_date: daysAgo(40), status: 'approved', manager_comment: 'Get well soon' },
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    leave_type: 'Casual',   leave_date: daysAgo(10), status: 'approved' },
    { tenant_id: tenantId, employee_id: empByEmail['vikram.singh@esam.in'].id,  leave_type: 'Earned',   leave_date: daysAgo(55), end_date: daysAgo(52), status: 'approved', manager_comment: 'Enjoy your break!' },
    { tenant_id: tenantId, employee_id: empByEmail['sneha.patel@esam.in'].id,   leave_type: 'Sick',     leave_date: daysAgo(20), status: 'rejected', manager_comment: 'Medical certificate required' },
    { tenant_id: tenantId, employee_id: empByEmail['arjun.nair@esam.in'].id,    leave_type: 'Casual',   leave_date: daysAgo(5),  status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['deepa.menon@esam.in'].id,   leave_type: 'Vacation', leave_date: daysAgo(70), end_date: daysAgo(65), status: 'approved' },
    { tenant_id: tenantId, employee_id: empByEmail['rohit.gupta@esam.in'].id,   leave_type: 'Earned',   leave_date: daysAgo(3),  status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['neha.joshi@esam.in'].id,    leave_type: 'Sick',     leave_date: daysAgo(15), status: 'approved', manager_comment: 'Approved' },
    { tenant_id: tenantId, employee_id: empByEmail['ankit.sharma@esam.in'].id,  leave_type: 'Casual',   leave_date: daysAgo(2),  status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['kavya.reddy@esam.in'].id,   leave_type: 'Sick',     leave_date: daysAgo(8),  status: 'approved' },
  ])
  console.log('✓ Leave requests')

  // ── Salary Advances ────────────────────────────────────────────────────────
  await db.from('salary_advances').insert([
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    amount: 20000, approved_amount: 20000, reason: 'Medical emergency for mother', status: 'approved', manager_comment: 'Approved, deduct over 2 months' },
    { tenant_id: tenantId, employee_id: empByEmail['sneha.patel@esam.in'].id,   amount: 15000, approved_amount: 10000, reason: 'House rent deposit',           status: 'approved', manager_comment: 'Partial approval' },
    { tenant_id: tenantId, employee_id: empByEmail['arjun.nair@esam.in'].id,    amount: 30000, reason: 'Vehicle purchase down payment',                         status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['neha.joshi@esam.in'].id,    amount: 10000, reason: 'Educational fees',                                      status: 'rejected', manager_comment: 'Insufficient leave balance' },
    { tenant_id: tenantId, employee_id: empByEmail['kavya.reddy@esam.in'].id,   amount: 8000,  reason: 'Travel emergency',                                      status: 'pending' },
  ])
  console.log('✓ Salary advances')

  // ── Support Tickets ────────────────────────────────────────────────────────
  const adminId = empByEmail['admin@esam.in'].id
  await db.from('support_tickets').insert([
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    subject: 'Payslip not reflecting bonus',   message: 'The October bonus of ₹15,000 is not showing in my November payslip. Kindly check and update.',    status: 'resolved', manager_reply: 'Resolved — payslip regenerated with bonus included.' },
    { tenant_id: tenantId, employee_id: empByEmail['vikram.singh@esam.in'].id,  subject: 'Shift change request',           message: 'I would like to request a shift change from Morning to Evening starting next month.',                status: 'resolved', manager_reply: 'Shift updated to Evening from 1st April.' },
    { tenant_id: tenantId, employee_id: empByEmail['sneha.patel@esam.in'].id,   subject: 'Leave balance incorrect',        message: 'My leave balance shows 8 days but I should have 10. I took only 2 sick leaves this year.',           status: 'open' },
    { tenant_id: tenantId, employee_id: empByEmail['arjun.nair@esam.in'].id,    subject: 'Attendance regularization issue', message: 'My regularization request for 15th March was not processed. Please look into it.',                   status: 'open' },
    { tenant_id: tenantId, employee_id: empByEmail['deepa.menon@esam.in'].id,   subject: 'PF contribution not deducting',  message: 'PF is not being deducted from my salary since January. Please correct this.',                        status: 'resolved', manager_reply: 'Investigated — PF will be deducted retroactively from April payroll.' },
    { tenant_id: tenantId, employee_id: empByEmail['rohit.gupta@esam.in'].id,   subject: 'Need salary certificate',        message: 'I need a salary certificate for bank loan application. Please issue at the earliest.',                status: 'open' },
  ])
  console.log('✓ Support tickets')

  // ── Payroll Records (Jan & Feb 2026, paid) ─────────────────────────────────
  const payrollRows = []
  for (const emp of employees.filter(e => e.role !== 'master_admin')) {
    for (const month of ['2026-01-01', '2026-02-01']) {
      const base = emp.base_salary
      const dailyRate = base / 30
      const daysPresent = 22 + Math.floor(Math.random() * 4)
      const daysHalf = Math.floor(Math.random() * 2)
      const daysAbsent = Math.max(0, 26 - daysPresent - daysHalf)
      const payableDays = daysPresent + daysHalf * 0.5
      const gross = payableDays * dailyRate
      const advance = emp.base_salary > 60000 && month === '2026-02-01' ? 5000 : 0
      const net = gross - advance
      payrollRows.push({
        tenant_id: tenantId,
        employee_id: emp.id,
        month,
        base_salary: base,
        days_present: daysPresent,
        days_half: daysHalf,
        days_double: 0,
        days_absent: daysAbsent,
        days_uninformed: 0,
        days_leave: 0,
        payable_days: payableDays,
        gross_salary: Math.round(gross),
        penalty_deduction: 0,
        advance_deduction: advance,
        bonus: 0,
        net_salary: Math.round(net),
        status: 'paid',
        paid_at: new Date(`${month.slice(0, 7)}-28`).toISOString(),
        total_allowances: Math.round(base * 0.4) + 4250,
        total_component_deductions: base > 70000 ? 200 : 0,
        pf_employee: 0,
        esi_employee: 0,
      })
    }
  }
  await db.from('payroll_records').insert(payrollRows)
  console.log(`✓ ${payrollRows.length} payroll records (Jan + Feb 2026)`)

  // ── Loans ──────────────────────────────────────────────────────────────────
  const { data: loanRows } = await db.from('employee_loans').insert([
    {
      tenant_id: tenantId,
      employee_id: empByEmail['vikram.singh@esam.in'].id,
      amount: 120000, reason: 'Home renovation', emi_amount: 12000,
      disbursed_on: '2025-10-01', months_total: 10, months_paid: 5, status: 'active',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['rohit.gupta@esam.in'].id,
      amount: 200000, reason: 'Medical emergency', emi_amount: 16667,
      disbursed_on: '2025-08-01', months_total: 12, months_paid: 7, status: 'active',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['neha.joshi@esam.in'].id,
      amount: 50000, reason: 'Laptop purchase', emi_amount: 10000,
      disbursed_on: '2025-06-01', months_total: 5, months_paid: 5, status: 'cleared',
    },
  ]).select('id, employee_id')
  console.log('✓ 3 loans')

  // Loan payments for active loans
  if (loanRows) {
    const payments = []
    for (const loan of loanRows) {
      for (let m = 1; m <= 4; m++) {
        const month = new Date(2025, 9 + m, 1).toISOString().split('T')[0]
        payments.push({ tenant_id: tenantId, loan_id: loan.id, employee_id: loan.employee_id, month, amount: 12000 })
      }
    }
    await db.from('loan_payments').insert(payments).select()
    console.log(`✓ Loan payments`)
  }

  // ── Expense Requests ───────────────────────────────────────────────────────
  await db.from('expense_requests').insert([
    { tenant_id: tenantId, employee_id: empByEmail['arjun.nair@esam.in'].id,    amount: 8500,  category: 'Travel',        description: 'Client visit to Bangalore — flight + hotel',         status: 'approved', approved_amount: 8500 },
    { tenant_id: tenantId, employee_id: empByEmail['sneha.patel@esam.in'].id,   amount: 3200,  category: 'Food',          description: 'Team offsite dinner reimbursement (8 members)',        status: 'approved', approved_amount: 2800, manager_note: 'Partial — per policy cap ₹350/head' },
    { tenant_id: tenantId, employee_id: empByEmail['vikram.singh@esam.in'].id,  amount: 45000, category: 'Equipment',     description: 'External 4K monitor for remote work setup',           status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['aisha.khan@esam.in'].id,    amount: 5800,  category: 'Medical',       description: 'Hospital visit and medication — family emergency',     status: 'approved', approved_amount: 5800 },
    { tenant_id: tenantId, employee_id: empByEmail['deepa.menon@esam.in'].id,   amount: 12000, category: 'Accommodation', description: 'Two-night stay for Chennai client onsite',             status: 'approved', approved_amount: 12000 },
    { tenant_id: tenantId, employee_id: empByEmail['rohit.gupta@esam.in'].id,   amount: 2400,  category: 'Travel',        description: 'Monthly cab reimbursement (office commute)',           status: 'pending' },
    { tenant_id: tenantId, employee_id: empByEmail['neha.joshi@esam.in'].id,    amount: 1500,  category: 'Food',          description: 'Working lunch during weekend sprint',                  status: 'rejected', manager_note: 'Weekend work needs pre-approval' },
    { tenant_id: tenantId, employee_id: empByEmail['kavya.reddy@esam.in'].id,   amount: 6200,  category: 'Travel',        description: 'Sales conference in Hyderabad — train + local travel', status: 'pending' },
  ])
  console.log('✓ Expense requests')

  // ── Employee Leave Balances (2026) ─────────────────────────────────────────
  const balanceRows = []
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const used = Math.floor(Math.random() * 4)
      balanceRows.push({
        tenant_id: tenantId,
        employee_id: emp.id,
        leave_type_id: lt.id,
        year: 2026,
        opening_balance: 0,
        accrued: lt.annual_quota,
        used,
        carry_forward: 0,
      })
    }
  }
  await db.from('employee_leave_balances').insert(balanceRows)
  console.log(`✓ ${balanceRows.length} leave balance records for 2026`)

  // ── Performance Reviews ────────────────────────────────────────────────────
  await db.from('performance_reviews').insert([
    {
      tenant_id: tenantId,
      employee_id: empByEmail['aisha.khan@esam.in'].id,
      reviewer_id: managerId,
      review_period: 'H2 2025',
      period_start: '2025-07-01', period_end: '2025-12-31',
      overall_rating: 4.5, performance_rating: 4.5, attendance_rating: 4.0, behavior_rating: 5.0,
      strengths: 'Excellent problem-solving skills. Consistently delivers ahead of deadlines. Strong team collaboration.',
      improvements: 'Could improve documentation practices and code review participation.',
      goals: 'Lead the payments module refactor. Complete AWS Solutions Architect certification by Q2 2026.',
      comments: 'Aisha has been a standout contributor this half. Ready for senior role consideration.',
      status: 'published',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['vikram.singh@esam.in'].id,
      reviewer_id: managerId,
      review_period: 'H2 2025',
      period_start: '2025-07-01', period_end: '2025-12-31',
      overall_rating: 4.0, performance_rating: 4.2, attendance_rating: 3.8, behavior_rating: 4.0,
      strengths: 'Deep technical knowledge. Great at mentoring junior developers.',
      improvements: 'Attendance consistency needs improvement. Better estimation of task timelines.',
      goals: 'Improve sprint velocity by 15%. Mentor 2 junior engineers.',
      comments: 'Solid performer with leadership potential.',
      status: 'published',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['arjun.nair@esam.in'].id,
      reviewer_id: adminId,
      review_period: 'H2 2025',
      period_start: '2025-07-01', period_end: '2025-12-31',
      overall_rating: 4.8, performance_rating: 5.0, attendance_rating: 4.5, behavior_rating: 5.0,
      strengths: 'Top sales performer — exceeded target by 32%. Excellent client relationship management.',
      improvements: 'Needs to improve CRM data entry hygiene.',
      goals: 'Achieve ₹2Cr in quarterly sales. Onboard 5 new enterprise clients.',
      comments: 'Arjun is our star salesperson this period. Recommend for Sales Lead role.',
      status: 'published',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['neha.joshi@esam.in'].id,
      reviewer_id: managerId,
      review_period: 'H1 2025',
      period_start: '2025-01-01', period_end: '2025-06-30',
      overall_rating: 3.5, performance_rating: 3.5, attendance_rating: 4.0, behavior_rating: 3.5,
      strengths: 'Quick learner. Good at frontend development.',
      improvements: 'Needs more confidence in presenting work. Should take more ownership.',
      goals: 'Complete React advanced course. Take ownership of one feature module end-to-end.',
      comments: 'Good first year, showing growth. Continue current trajectory.',
      status: 'published',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['rohit.gupta@esam.in'].id,
      reviewer_id: adminId,
      review_period: 'H2 2025',
      period_start: '2025-07-01', period_end: '2025-12-31',
      overall_rating: 4.2, performance_rating: 4.0, attendance_rating: 4.5, behavior_rating: 4.2,
      strengths: 'Highly accurate financial reporting. Proactively identifies cost-saving opportunities.',
      improvements: 'Should adopt more automation tools to reduce manual work.',
      goals: 'Implement automated MIS reporting. Complete CA Inter exam.',
      comments: 'Reliable and precise. Great addition to the Finance team.',
      status: 'published',
    },
  ])
  console.log('✓ 5 performance reviews')

  // ── Warning Letters ────────────────────────────────────────────────────────
  await db.from('warning_letters').insert([
    {
      tenant_id: tenantId,
      employee_id: empByEmail['ankit.sharma@esam.in'].id,
      issued_by: adminId,
      warning_type: 'verbal',
      subject: 'Repeated Late Arrivals',
      description: 'This is a formal verbal warning regarding your repeated late arrivals to work over the past 30 days. You have been late on 8 occasions without prior notification. This is impacting team schedules and project delivery. Please ensure punctuality going forward.',
      issued_on: daysAgo(20),
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['kavya.reddy@esam.in'].id,
      issued_by: managerId,
      warning_type: 'written',
      subject: 'Missed Sales Targets — Q4 2025',
      description: 'This written warning is issued for consistently missing agreed-upon sales targets in Q4 2025. Despite two informal discussions and a performance improvement plan, targets have not been met. A failure to meet targets in Q1 2026 will result in escalation to a final warning.',
      issued_on: daysAgo(45),
    },
  ])
  console.log('✓ Warning letters')

  // ── Attendance Regularizations ────────────────────────────────────────────
  await db.from('attendance_regularizations').insert([
    {
      tenant_id: tenantId,
      employee_id: empByEmail['aisha.khan@esam.in'].id,
      date: daysAgo(12),
      current_status: 'Absent',
      requested_status: 'Present',
      reason: 'I was working from home due to a technical issue with my access card. My manager can confirm.',
      status: 'approved',
      manager_note: 'Confirmed with Priya — approved',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['arjun.nair@esam.in'].id,
      date: daysAgo(6),
      current_status: 'HalfDay',
      requested_status: 'Present',
      reason: 'Attended full day but clocked out late and system marked half day.',
      status: 'pending',
    },
    {
      tenant_id: tenantId,
      employee_id: empByEmail['sneha.patel@esam.in'].id,
      date: daysAgo(18),
      current_status: 'Absent',
      requested_status: 'ApprovedLeave',
      reason: 'Leave was pre-approved verbally but not entered in the system.',
      status: 'rejected',
      manager_note: 'Leave application should have been submitted in advance',
    },
  ])
  console.log('✓ Attendance regularizations')

  // ── Broadcasts ────────────────────────────────────────────────────────────
  await db.from('broadcasts').insert([
    {
      tenant_id: tenantId,
      message: '🎉 Congratulations to Arjun Nair for achieving 132% of his Q4 sales target! Huge milestone for the team.',
      target_shift: 'All',
      created_by: adminId,
    },
    {
      tenant_id: tenantId,
      message: '📢 Reminder: Q1 2026 appraisal forms must be submitted by April 5th. Please complete your self-assessment on the portal.',
      target_shift: 'All',
      created_by: adminId,
    },
    {
      tenant_id: tenantId,
      message: '🛡️ Security Update: All employees must enable 2FA on their work email accounts by March 31st.',
      target_shift: 'Morning',
      created_by: managerId,
    },
  ])
  console.log('✓ Broadcasts')

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
╔═══════════════════════════════════════════════════════╗
║           ✅  Seed complete!                          ║
╠═══════════════════════════════════════════════════════╣
║  Tenant slug : ${TENANT_SLUG.padEnd(38)}║
║  Employees   : ${String(employees.length).padEnd(38)}║
║  Password    : ${DEMO_PASSWORD.padEnd(38)}║
╠═══════════════════════════════════════════════════════╣
║  Accounts                                             ║
║    admin@esam.in          → master_admin              ║
║    manager@esam.in        → manager                  ║
║    attendance@esam.in     → attendance               ║
║    aisha.khan@esam.in     → employee (Engineering)   ║
║    vikram.singh@esam.in   → employee (Engineering)   ║
║    sneha.patel@esam.in    → employee (Marketing)     ║
║    arjun.nair@esam.in     → employee (Sales)         ║
║    deepa.menon@esam.in    → employee (HR)            ║
║    rohit.gupta@esam.in    → employee (Finance)       ║
║    neha.joshi@esam.in     → employee (Engineering)   ║
║    ankit.sharma@esam.in   → employee (Marketing)     ║
║    kavya.reddy@esam.in    → employee (Sales)         ║
╚═══════════════════════════════════════════════════════╝
  `)
}

main().catch(err => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
