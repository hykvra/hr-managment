import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const mm    = String(month).padStart(2, '0')
  const firstDay = `${year}-${mm}-01`
  const lastDay  = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

  const istNow   = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const today    = istNow.toISOString().slice(0, 10)

  const [
    { data: employees },
    { data: leavesThisMonth },
    { data: advancesPending },
    { data: resignationsThisMonth },
    { data: payrollThisMonth },
    { data: todayAttendance },
    { data: pendingRegistrations },
  ] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, base_salary, department, employment_type, role')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('role', 'in', '("master_admin")'),

    supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .gte('leave_date', firstDay)
      .lte('leave_date', lastDay),

    supabaseAdmin
      .from('salary_advances')
      .select('id, amount, approved_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved'),

    supabaseAdmin
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('resignation_status', true)
      .gte('resignation_date', firstDay)
      .lte('resignation_date', lastDay),

    supabaseAdmin
      .from('payroll_records')
      .select('net_salary, status')
      .eq('tenant_id', tenantId)
      .gte('month', firstDay)
      .lte('month', lastDay),

    supabaseAdmin
      .from('attendance')
      .select('employee_id, status')
      .eq('tenant_id', tenantId)
      .eq('date', today),

    supabaseAdmin
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', false)
      .is('employee_code', null),
  ])

  const headcount  = employees?.length || 0
  const salarySum  = (employees || []).reduce((s, e) => s + Number(e.base_salary || 0), 0)
  const avgSalary  = headcount > 0 ? Math.round(salarySum / headcount) : 0
  const totalSalaryBill = salarySum

  const leavesTaken         = leavesThisMonth?.length || 0
  const advancesOutstanding = (advancesPending || []).reduce(
    (s, a) => s + Number(a.approved_amount ?? a.amount ?? 0), 0
  )
  const resignationsCount = resignationsThisMonth?.length || 0
  const pendingCount      = pendingRegistrations?.length || 0

  const payrollNetTotal = (payrollThisMonth || []).reduce((s, p) => s + Number(p.net_salary || 0), 0)
  const payrollPaidCount = (payrollThisMonth || []).filter(p => p.status === 'paid').length
  const payrollTotalCount = payrollThisMonth?.length || 0

  // Department breakdown
  const deptBreakdown: Record<string, number> = {}
  ;(employees || []).forEach(e => {
    const dept = e.department?.trim() || 'Unassigned'
    deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1
  })

  // Employment-type breakdown
  const typeBreakdown: Record<string, number> = { regular: 0, contractual: 0, daily_wage: 0 }
  ;(employees || []).forEach(e => {
    const t = (e.employment_type as string) || 'regular'
    typeBreakdown[t] = (typeBreakdown[t] || 0) + 1
  })

  // Today's attendance summary
  const presentToday = (todayAttendance || []).filter(a =>
    ['Present', 'HalfDay', 'DoubleShift', 'ApprovedLeave'].includes(a.status)
  ).length
  const absentToday  = (todayAttendance || []).filter(a =>
    ['Absent', 'Uninformed'].includes(a.status)
  ).length
  const markedToday  = todayAttendance?.length || 0

  return NextResponse.json({
    headcount,
    avgSalary,
    totalSalaryBill,
    leavesTaken,
    advancesOutstanding,
    resignationsCount,
    pendingCount,
    payrollNetTotal,
    payrollPaidCount,
    payrollTotalCount,
    deptBreakdown,
    typeBreakdown,
    presentToday,
    absentToday,
    markedToday,
    month: `${year}-${mm}`,
    today,
  })
}
