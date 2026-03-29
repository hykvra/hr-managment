import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.annual_quota !== undefined) updates.annual_quota = body.annual_quota
  if (body.carry_forward_enabled !== undefined) updates.carry_forward_enabled = body.carry_forward_enabled
  if (body.max_carry_forward !== undefined) updates.max_carry_forward = body.max_carry_forward
  if (body.color !== undefined) updates.color = body.color
  if (body.is_active !== undefined) updates.is_active = body.is_active

  const { error } = await supabaseAdmin
    .from('leave_types')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 })

  await activityLog({
    action: 'leave_type_updated',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'leave_type',
    entity_id: params.id,
    details: updates,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  // Fetch the leave type name first
  const { data: ltData } = await supabaseAdmin
    .from('leave_types')
    .select('name')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  // Check if any leave requests use this type
  const { count } = await supabaseAdmin
    .from('leave_requests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('leave_type', ltData?.name ?? '')

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a leave type that has existing leave requests' },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin
    .from('leave_types')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 })

  return NextResponse.json({ success: true })
}
