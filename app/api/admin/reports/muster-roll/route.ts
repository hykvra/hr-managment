import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager', 'attendance']

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year  = parseInt(searchParams.get('year')  || String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  const mm = String(month).padStart(2, '0')
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = `${year}-${mm}-01`
  const lastDay  = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`

  const [{ data: employees }, { data: attendance }, { data: companySettings }] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('role', 'in', '("master_admin")')
      .order('first_name'),
    supabaseAdmin
      .from('attendance')
      .select('employee_id, date, status')
      .eq('tenant_id', tenantId)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId),
  ])

  // employee_id → date (YYYY-MM-DD) → status
  const attMap: Record<string, Record<string, string>> = {}
  attendance?.forEach(a => {
    if (!attMap[a.employee_id]) attMap[a.employee_id] = {}
    attMap[a.employee_id][a.date] = a.status
  })

  const companyName =
    companySettings?.find(s => s.setting_key === 'company_name')?.setting_value || 'Company'

  const rows = (employees || []).map(emp => {
    const days: Record<number, string> = {}
    let present = 0, half = 0, double_ = 0, leave = 0, absent = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`
      const status = attMap[emp.id]?.[dateStr] || ''
      days[d] = status

      if (status === 'Present')       present++
      else if (status === 'HalfDay')  half++
      else if (status === 'DoubleShift') { double_++; present++ }
      else if (status === 'ApprovedLeave') leave++
      else if (status === 'Absent' || status === 'Uninformed') absent++
    }

    return { ...emp, days, present, half, double: double_, leave, absent }
  })

  return NextResponse.json({ rows, daysInMonth, year, month, companyName })
}
