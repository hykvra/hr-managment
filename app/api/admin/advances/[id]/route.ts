import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

async function canManageSalary(role: string, userId: string, tenantId: string): Promise<boolean> {
  if (role === 'master_admin') return true
  const { data } = await supabaseAdmin
    .from('admin_permissions')
    .select('can_manage_salary')
    .eq('employee_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as { can_manage_salary: boolean } | null)?.can_manage_salary === true
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  if (!(await canManageSalary(session.role, session.id, tenantId))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { action, approved_amount, comment } = await req.json()

  if (action === 'approve') {
    if (!approved_amount || Number(approved_amount) <= 0) {
      return NextResponse.json({ error: 'Approved amount is required' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('salary_advances')
      .update({
        status: 'approved',
        approved_amount: Number(approved_amount),
        manager_comment: comment?.trim() || null,
      })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: 'Failed to approve advance' }, { status: 500 })
  } else if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('salary_advances')
      .update({
        status: 'rejected',
        manager_comment: comment?.trim() || null,
      })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: 'Failed to reject advance' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await activityLog({
    action: action === 'approve' ? 'advance_approved' : 'advance_rejected',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'advance',
    entity_id: params.id,
    details: { action, approved_amount, comment },
  })

  return NextResponse.json({ success: true })
}
