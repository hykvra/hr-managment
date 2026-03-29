import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

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

  const [year, mon] = month.split('-').map(Number)
  const firstDay = `${month}-01`
  const daysInMonth = new Date(year, mon, 0).getDate()
  const lastDay = `${month}-${String(daysInMonth).padStart(2, '0')}`

  const [{ data: employees }, { data: attendance }] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, shift_id')
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
  ])

  // Index attendance by employee
  const attMap: Record<string, Record<string, number>> = {}
  for (const a of attendance || []) {
    if (!attMap[a.employee_id]) {
      attMap[a.employee_id] = { Present: 0, HalfDay: 0, DoubleShift: 0, Absent: 0, Uninformed: 0, ApprovedLeave: 0 }
    }
    attMap[a.employee_id][a.status] = (attMap[a.employee_id][a.status] || 0) + 1
  }

  const rows = (employees || []).map(emp => {
    const a = attMap[emp.id] || {}
    const present = a.Present || 0
    const half = a.HalfDay || 0
    const double_ = a.DoubleShift || 0
    const absent = a.Absent || 0
    const uninformed = a.Uninformed || 0
    const leave = a.ApprovedLeave || 0
    const total = present + half + double_ + absent + uninformed + leave
    const effectiveDays = present + double_ * 2 + half * 0.5 + leave
    const presentPct = daysInMonth > 0 ? Math.round((effectiveDays / daysInMonth) * 100) : 0

    return {
      employee_id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      employee_code: emp.employee_code,
      days_present: present,
      days_half: half,
      days_double: double_,
      days_absent: absent,
      days_uninformed: uninformed,
      days_leave: leave,
      total_recorded: total,
      effective_days: Math.round(effectiveDays * 10) / 10,
      present_pct: presentPct,
    }
  })

  return NextResponse.json({ rows, days_in_month: daysInMonth })
}
