import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('attendance_regularizations')
    .select('id, date, current_status, requested_status, reason, status, manager_note, created_at')
    .eq('employee_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json({ regularizations: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { date, requested_status, reason } = await req.json() as {
    date: string
    requested_status: string
    reason: string
  }

  const VALID_STATUSES = ['Present', 'HalfDay', 'DoubleShift', 'Absent', 'ApprovedLeave']
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(requested_status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  // Check for pending request on same date
  const { data: existing } = await supabaseAdmin
    .from('attendance_regularizations')
    .select('id, status')
    .eq('employee_id', session.id)
    .eq('date', date)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A pending request already exists for this date' }, { status: 409 })
  }

  // Get current attendance status for the date
  const { data: att } = await supabaseAdmin
    .from('attendance')
    .select('status')
    .eq('employee_id', session.id)
    .eq('date', date)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('attendance_regularizations')
    .insert({
      tenant_id: tenantId,
      employee_id: session.id,
      date,
      current_status: att?.status || null,
      requested_status,
      reason: reason.trim(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id }, { status: 201 })
}
