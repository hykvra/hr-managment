import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

async function canApproveLeaves(role: string, userId: string, tenantId: string): Promise<boolean> {
  if (role === 'master_admin') return true
  const { data } = await supabaseAdmin
    .from('admin_permissions')
    .select('can_approve_leaves')
    .eq('employee_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as { can_approve_leaves: boolean } | null)?.can_approve_leaves === true
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  if (!(await canApproveLeaves(session.role, session.id, tenantId))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { action, comment } = await req.json()

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('leave_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      manager_comment: comment?.trim() || null,
    })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })

  await activityLog({
    action: action === 'approve' ? 'leave_approved' : 'leave_rejected',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'leave',
    entity_id: params.id,
    details: { action, comment },
  })

  return NextResponse.json({ success: true })
}
