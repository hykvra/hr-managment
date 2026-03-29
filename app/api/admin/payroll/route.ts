import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

const ALLOWED = ['master_admin', 'manager']

// PF/ESI constants (India 2024)
const PF_RATE = 0.12          // 12% employee + 12% employer
const ESI_EMP_RATE = 0.0075   // 0.75% employee
const ESI_GROSS_LIMIT = 21000 // ESI applies only if gross ≤ ₹21,000

type PayComponent = {
  employee_id: string
  component_type: 'allowance' | 'deduction'
  amount: number
  is_percentage: boolean
}

function calcPayableRegular(effective: number): number {
  if (effective >= 26) return 30
  if (effective >= 24) return 28
  if (effective >= 22) return 26
  return effective
}

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  const firstDay = `${month}-01`
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const lastDay = `${month}-${String(daysInMonth).padStart(2, '0')}`

  const [
    { data: employees },
    { data: attendance },
    { data: advances },
    { data: existing },
    { data: payComponents },
    { data: activeLoans },
  ] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, base_salary, employment_type, pf_enabled, esi_enabled')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('role', 'in', '("master_admin","attendance")')
      .order('first_name'),
    supabaseAdmin
      .from('attendance')
      .select('employee_id, status')
      .eq('tenant_id', tenantId)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabaseAdmin
      .from('salary_advances')
      .select('employee_id, approved_amount, amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .gte('created_at', firstDay)
      .lte('created_at', `${lastDay}T23:59:59`),
    supabaseAdmin
      .from('payroll_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('month', firstDay),
    supabaseAdmin
      .from('employee_pay_components')
      .select('employee_id, component_type, amount, is_percentage, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabaseAdmin
      .from('employee_loans')
      .select('employee_id, emi_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ])

  // Index existing records
  const existingMap: Record<string, Record<string, unknown>> = {}
  for (const r of existing || []) {
    existingMap[(r as Record<string, unknown>).employee_id as string] = r as Record<string, unknown>
  }

  // Index attendance by employee
  const attMap: Record<string, Record<string, number>> = {}
  for (const a of attendance || []) {
    if (!attMap[a.employee_id]) {
      attMap[a.employee_id] = { Present: 0, HalfDay: 0, DoubleShift: 0, Absent: 0, Uninformed: 0, ApprovedLeave: 0 }
    }
    attMap[a.employee_id][a.status] = (attMap[a.employee_id][a.status] || 0) + 1
  }

  // Index advances by employee
  const advMap: Record<string, number> = {}
  for (const adv of advances || []) {
    const amt = Number(adv.approved_amount || adv.amount)
    advMap[adv.employee_id] = (advMap[adv.employee_id] || 0) + amt
  }

  // Index active loan EMI by employee (sum all active loans per employee)
  const loanMap: Record<string, number> = {}
  for (const loan of (activeLoans || [])) {
    loanMap[loan.employee_id] = (loanMap[loan.employee_id] || 0) + Number(loan.emi_amount)
  }

  // Build per-employee component maps with percentage resolution
  const empComponentMap: Record<string, { allowances: number; deductions: number; raw: PayComponent[] }> = {}
  for (const c of (payComponents as PayComponent[] || [])) {
    if (!empComponentMap[c.employee_id]) empComponentMap[c.employee_id] = { allowances: 0, deductions: 0, raw: [] }
    empComponentMap[c.employee_id].raw.push(c)
  }

  const records = (employees || []).map(emp => {
    const ex = existingMap[emp.id]
    const empType: string = (emp as Record<string, unknown>).employment_type as string || 'regular'
    const pfEnabled = (emp as Record<string, unknown>).pf_enabled as boolean || false
    const esiEnabled = (emp as Record<string, unknown>).esi_enabled as boolean || false
    const baseSalary = Number(emp.base_salary)
    const daily = baseSalary / 30

    // Resolve pay components with percentage
    const rawComps = empComponentMap[emp.id]?.raw || []
    let totalAllowances = 0
    let totalCompDeductions = 0
    for (const c of rawComps) {
      const val = c.is_percentage ? round2(baseSalary * Number(c.amount) / 100) : Number(c.amount)
      if (c.component_type === 'allowance') totalAllowances += val
      else totalCompDeductions += val
    }

    if (ex) {
      return {
        record_id: ex.id,
        employee_id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        employee_code: emp.employee_code,
        base_salary: baseSalary,
        employment_type: empType,
        pf_enabled: pfEnabled,
        esi_enabled: esiEnabled,
        days_present: ex.days_present,
        days_half: ex.days_half,
        days_double: ex.days_double,
        days_absent: ex.days_absent,
        days_uninformed: ex.days_uninformed,
        days_leave: ex.days_leave,
        payable_days: Number(ex.payable_days),
        gross_salary: Number(ex.gross_salary),
        total_allowances: Number(ex.total_allowances || 0),
        total_component_deductions: Number(ex.total_component_deductions || 0),
        penalty_deduction: Number(ex.penalty_deduction),
        advance_deduction: Number(ex.advance_deduction),
        loan_deduction: Number(ex.loan_deduction || 0),
        pf_employee: Number(ex.pf_employee || 0),
        pf_employer: Number(ex.pf_employer || 0),
        esi_employee: Number(ex.esi_employee || 0),
        esi_employer: Number(ex.esi_employer || 0),
        ot_hours: Number(ex.ot_hours || 0),
        ot_pay: Number(ex.ot_pay || 0),
        bonus: Number(ex.bonus),
        net_salary: Number(ex.net_salary),
        status: ex.status,
        paid_at: ex.paid_at,
        notes: ex.notes,
      }
    }

    const att = attMap[emp.id] || {}
    const present = att.Present || 0
    const half = att.HalfDay || 0
    const double_ = att.DoubleShift || 0
    const absent = att.Absent || 0
    const uninformed = att.Uninformed || 0
    const leave = att.ApprovedLeave || 0
    const advance    = advMap[emp.id]  || 0
    const loanEmi    = loanMap[emp.id] || 0

    let payable = 0
    let gross = 0
    let penalty = 0

    if (empType === 'contractual') {
      // Fixed monthly: always 30 days, no penalty
      payable = 30
      gross = baseSalary
      penalty = 0
    } else if (empType === 'daily_wage') {
      // Pure days × daily rate, no threshold, no uninformed penalty
      payable = present + double_ * 2 + half * 0.5 + leave
      gross = round2(payable * daily)
      penalty = 0
    } else {
      // Regular: threshold-based
      const effective = present + double_ * 2 + half * 0.5 + leave
      payable = calcPayableRegular(effective)
      gross = round2(payable * daily)
      penalty = round2(uninformed * daily * 2)
    }

    // PF calculation
    let pfEmployee = 0
    let pfEmployer = 0
    if (pfEnabled) {
      pfEmployee = round2(baseSalary * PF_RATE)
      pfEmployer = round2(baseSalary * PF_RATE)
    }

    // ESI calculation (only if gross + allowances ≤ 21000)
    const grossWithAllowances = gross + totalAllowances
    let esiEmployee = 0
    let esiEmployer = 0
    if (esiEnabled && grossWithAllowances <= ESI_GROSS_LIMIT) {
      esiEmployee = round2(grossWithAllowances * ESI_EMP_RATE)
      esiEmployer = round2(grossWithAllowances * 0.0325)
    }

    const net = Math.max(0, round2(
      gross + totalAllowances - penalty - advance - loanEmi - totalCompDeductions - pfEmployee - esiEmployee
    ))

    return {
      record_id: null,
      employee_id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      employee_code: emp.employee_code,
      base_salary: baseSalary,
      employment_type: empType,
      pf_enabled: pfEnabled,
      esi_enabled: esiEnabled,
      days_present: present,
      days_half: half,
      days_double: double_,
      days_absent: absent,
      days_uninformed: uninformed,
      days_leave: leave,
      payable_days: empType === 'daily_wage' ? round2(payable) : payable,
      gross_salary: gross,
      total_allowances: round2(totalAllowances),
      total_component_deductions: round2(totalCompDeductions),
      penalty_deduction: penalty,
      advance_deduction: round2(advance),
      loan_deduction: round2(loanEmi),
      pf_employee: pfEmployee,
      pf_employer: pfEmployer,
      esi_employee: esiEmployee,
      esi_employer: esiEmployer,
      ot_hours: 0,
      ot_pay: 0,
      bonus: 0,
      net_salary: net,
      status: 'draft',
      paid_at: null,
      notes: null,
    }
  })

  return NextResponse.json({ records, month: firstDay })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { month, records } = await req.json() as {
    month: string
    records: {
      employee_id: string
      employment_type?: string
      days_present: number; days_half: number; days_double: number
      days_absent: number; days_uninformed: number; days_leave: number
      base_salary: number; payable_days: number; gross_salary: number
      total_allowances?: number; total_component_deductions?: number
      penalty_deduction: number; advance_deduction: number
      loan_deduction?: number
      pf_employee?: number; pf_employer?: number
      esi_employee?: number; esi_employer?: number
      ot_hours?: number; ot_pay?: number
      bonus: number; net_salary: number; notes?: string
    }[]
  }

  if (!month || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const firstDay = `${month}-01`

  const rows = records.map(r => ({
    tenant_id: tenantId,
    employee_id: r.employee_id,
    month: firstDay,
    employment_type: r.employment_type || 'regular',
    days_present: r.days_present,
    days_half: r.days_half,
    days_double: r.days_double,
    days_absent: r.days_absent,
    days_uninformed: r.days_uninformed,
    days_leave: r.days_leave,
    base_salary: r.base_salary,
    payable_days: r.payable_days,
    gross_salary: r.gross_salary,
    total_allowances: r.total_allowances || 0,
    total_component_deductions: r.total_component_deductions || 0,
    penalty_deduction: r.penalty_deduction,
    advance_deduction: r.advance_deduction,
    loan_deduction: r.loan_deduction || 0,
    pf_employee: r.pf_employee || 0,
    pf_employer: r.pf_employer || 0,
    esi_employee: r.esi_employee || 0,
    esi_employer: r.esi_employer || 0,
    ot_hours: r.ot_hours || 0,
    ot_pay: r.ot_pay || 0,
    bonus: r.bonus,
    net_salary: r.net_salary,
    notes: r.notes || null,
    status: 'draft',
  }))

  const { error } = await supabaseAdmin
    .from('payroll_records')
    .upsert(rows, { onConflict: 'employee_id,month' })

  if (error) return NextResponse.json({ error: 'Failed to save payroll' }, { status: 500 })

  await activityLog({
    action: 'payroll_generated',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'payroll',
    entity_name: month,
    details: { month, employee_count: rows.length },
  })

  return NextResponse.json({ success: true, saved: rows.length })
}
