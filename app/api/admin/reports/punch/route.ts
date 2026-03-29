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
  // Default to today (server UTC → IST)
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const defaultDate = istNow.toISOString().slice(0, 10)
  const date = searchParams.get('date') || defaultDate

  const [{ data: employees }, { data: attendance }] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('role', 'in', '("master_admin")')
      .order('first_name'),
    supabaseAdmin
      .from('attendance')
      .select('employee_id, status, clock_in_time, clock_out_time')
      .eq('tenant_id', tenantId)
      .eq('date', date),
  ])

  const attMap: Record<string, {
    status: string
    clock_in_time: string | null
    clock_out_time: string | null
  }> = {}
  attendance?.forEach(a => {
    attMap[a.employee_id] = {
      status: a.status,
      clock_in_time: a.clock_in_time,
      clock_out_time: a.clock_out_time,
    }
  })

  const rows = (employees || []).map(emp => ({
    ...emp,
    status: attMap[emp.id]?.status || null,
    clock_in_time: attMap[emp.id]?.clock_in_time || null,
    clock_out_time: attMap[emp.id]?.clock_out_time || null,
  }))

  return NextResponse.json({ rows, date })
}
