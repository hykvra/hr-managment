import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

function calcPayable(effective: number): number {
  if (effective >= 26) return 30
  if (effective >= 24) return 28
  if (effective >= 22) return 26
  return effective
}

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
  ] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, base_salary')
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
      .lte('created_at', lastDay + 'T23:59:59'),
    supabaseAdmin
      .from('payroll_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('month', firstDay),
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

  const records = (employees || []).map(emp => {
    const ex = existingMap[emp.id]
    if (ex) {
      return {
        record_id: ex.id,
        employee_id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        employee_code: emp.employee_code,
        base_salary: Number(emp.base_salary),
        days_present: ex.days_present,
        days_half: ex.days_half,
        days_double: ex.days_double,
        days_absent: ex.days_absent,
        days_uninformed: ex.days_uninformed,
        days_leave: ex.days_leave,
        payable_days: Number(ex.payable_days),
        gross_salary: Number(ex.gross_salary),
        penalty_deduction: Number(ex.penalty_deduction),
        advance_deduction: Number(ex.advance_deduction),
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

    const daily = Number(emp.base_salary) / 30
    const effective = present + double_ * 2 + half * 0.5 + leave
    const payable = calcPayable(effective)
    const gross = payable * daily
    const penalty = uninformed * daily * 2
    const advance = advMap[emp.id] || 0
    const net = Math.max(0, gross - penalty - advance)

    return {
      record_id: null,
      employee_id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      employee_code: emp.employee_code,
      base_salary: Number(emp.base_salary),
      days_present: present,
      days_half: half,
      days_double: double_,
      days_absent: absent,
      days_uninformed: uninformed,
      days_leave: leave,
      payable_days: payable,
      gross_salary: Math.round(gross * 100) / 100,
      penalty_deduction: Math.round(penalty * 100) / 100,
      advance_deduction: Math.round(advance * 100) / 100,
      bonus: 0,
      net_salary: Math.round(net * 100) / 100,
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
      days_present: number; days_half: number; days_double: number
      days_absent: number; days_uninformed: number; days_leave: number
      base_salary: number; payable_days: number; gross_salary: number
      penalty_deduction: number; advance_deduction: number
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
    days_present: r.days_present,
    days_half: r.days_half,
    days_double: r.days_double,
    days_absent: r.days_absent,
    days_uninformed: r.days_uninformed,
    days_leave: r.days_leave,
    base_salary: r.base_salary,
    payable_days: r.payable_days,
    gross_salary: r.gross_salary,
    penalty_deduction: r.penalty_deduction,
    advance_deduction: r.advance_deduction,
    bonus: r.bonus,
    net_salary: r.net_salary,
    notes: r.notes || null,
    status: 'draft',
  }))

  const { error } = await supabaseAdmin
    .from('payroll_records')
    .upsert(rows, { onConflict: 'employee_id,month' })

  if (error) return NextResponse.json({ error: 'Failed to save payroll' }, { status: 500 })

  return NextResponse.json({ success: true, saved: rows.length })
}
