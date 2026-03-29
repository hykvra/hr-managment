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
  const status = searchParams.get('status') || 'pending'

  let query = supabaseAdmin
    .from('attendance_regularizations')
    .select('id, date, current_status, requested_status, reason, status, manager_note, created_at, employees(first_name, last_name, employee_code)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json({ regularizations: data || [] })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { id, action, manager_note } = await req.json() as {
    id: string
    action: 'approve' | 'reject'
    manager_note?: string
  }

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Fetch the request
  const { data: reg } = await supabaseAdmin
    .from('attendance_regularizations')
    .select('id, employee_id, date, requested_status, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (reg.status !== 'pending') return NextResponse.json({ error: 'Already actioned' }, { status: 409 })

  // Update regularization status
  const { error: updErr } = await supabaseAdmin
    .from('attendance_regularizations')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', manager_note: manager_note?.trim() || null })
    .eq('id', id)

  if (updErr) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  // If approved — upsert attendance record
  if (action === 'approve') {
    await supabaseAdmin
      .from('attendance')
      .upsert(
        { tenant_id: tenantId, employee_id: reg.employee_id, date: reg.date, status: reg.requested_status },
        { onConflict: 'employee_id,date' }
      )
  }

  return NextResponse.json({ success: true })
}
