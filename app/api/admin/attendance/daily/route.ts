import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

const ALLOWED = ['master_admin', 'manager', 'attendance']

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const [{ data: existing }, { data: leaves }] = await Promise.all([
    supabaseAdmin
      .from('attendance')
      .select('employee_id, status')
      .eq('tenant_id', tenantId)
      .eq('date', date),
    supabaseAdmin
      .from('leave_requests')
      .select('employee_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .or(`and(leave_date.eq.${date},end_date.is.null),and(leave_date.lte.${date},end_date.gte.${date})`),
  ])

  const attendance: Record<string, string> = {}
  existing?.forEach(r => { attendance[r.employee_id] = r.status })

  const approvedLeaveIds = (leaves || []).map(l => l.employee_id as string)

  return NextResponse.json({ attendance, approvedLeaveIds })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { date, records } = await req.json() as {
    date: string
    records: { employee_id: string; status: string }[]
  }

  if (!date || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const validStatuses = ['Present', 'Absent', 'HalfDay', 'Uninformed', 'DoubleShift', 'ApprovedLeave']
  const rows = records
    .filter(r => r.employee_id && validStatuses.includes(r.status))
    .map(r => ({ tenant_id: tenantId, employee_id: r.employee_id, date, status: r.status }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid records' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('attendance')
    .upsert(rows, { onConflict: 'employee_id,date' })

  if (error) return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })

  await activityLog({
    action: 'attendance_saved',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'attendance',
    entity_name: date,
    details: { date, count: rows.length },
  })

  return NextResponse.json({ success: true, saved: rows.length })
}
