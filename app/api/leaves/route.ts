import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select('id, leave_type, leave_date, end_date, status, manager_comment, exception_flag, created_at')
    .eq('tenant_id', tenantId)
    .eq('employee_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
  return NextResponse.json({ leaves: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { leave_type, leave_date, end_date } = body

  if (!leave_type || !leave_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate leave type — check against custom leave_types table first, then fallback to legacy
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  const validTypes = leaveTypes && leaveTypes.length > 0
    ? leaveTypes.map(lt => lt.name)
    : ['Sick', 'Casual', 'Earned', 'Vacation']

  if (!validTypes.includes(leave_type)) {
    return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 })
  }

  // Check if leave_date is a company holiday
  const { data: holiday } = await supabaseAdmin
    .from('company_holidays')
    .select('name')
    .eq('tenant_id', tenantId)
    .eq('date', leave_date)
    .maybeSingle()

  if (holiday) {
    return NextResponse.json(
      { error: `${leave_date} is a company holiday (${holiday.name}). No leave request needed.` },
      { status: 400 }
    )
  }

  // Check for existing pending/approved leave on this start date
  const { data: existing } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .eq('employee_id', session.id)
    .eq('tenant_id', tenantId)
    .eq('leave_date', leave_date)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a leave request for this date' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('leave_requests').insert({
    tenant_id: tenantId,
    employee_id: session.id,
    leave_type,
    leave_date,
    end_date: end_date || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 })
  }

  await activityLog({
    action: 'leave_requested',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'leave',
    entity_name: `${leave_type} — ${leave_date}`,
    details: { leave_type, leave_date, end_date },
  })

  return NextResponse.json({ success: true })
}
