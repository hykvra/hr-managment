import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
  return NextResponse.json({ success: true })
}
