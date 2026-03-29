import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'
import { sendLeaveNotificationEmail } from '@/lib/mailer'

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

  // Fetch the leave request details
  const { data: leave } = await supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, leave_date, end_date, leave_type, status, employees(first_name, email)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('leave_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      manager_comment: comment?.trim() || null,
    })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })

  // Decrement leave balance if approved
  if (action === 'approve') {
    try {
      // Calculate number of days
      const start = new Date(leave.leave_date)
      const end = leave.end_date ? new Date(leave.end_date) : start
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      const year = start.getFullYear()

      // Try to match leave type to leave_types table
      const { data: leaveType } = await supabaseAdmin
        .from('leave_types')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${leave.leave_type}%`)
        .maybeSingle()

      if (leaveType) {
        // Read current used, then increment
        const { data: bal } = await supabaseAdmin
          .from('employee_leave_balances')
          .select('id, used')
          .eq('employee_id', leave.employee_id)
          .eq('leave_type_id', leaveType.id)
          .eq('year', year)
          .maybeSingle()

        if (bal) {
          await supabaseAdmin
            .from('employee_leave_balances')
            .update({ used: Number(bal.used) + days })
            .eq('id', bal.id)
        }
      }

      // Always decrement the legacy leave_balance field too
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('leave_balance')
        .eq('id', leave.employee_id)
        .single()
      if (emp && emp.leave_balance !== null) {
        await supabaseAdmin
          .from('employees')
          .update({ leave_balance: Math.max(0, Number(emp.leave_balance) - days) })
          .eq('id', leave.employee_id)
      }
    } catch { /* non-critical */ }
  }

  // Send notification email (non-blocking)
  const empData = leave.employees as unknown as { first_name: string; email: string } | null
  if (empData?.email) {
    sendLeaveNotificationEmail(
      empData.email,
      empData.first_name,
      action === 'approve' ? 'approved' : 'rejected',
      leave.leave_type,
      leave.leave_date,
      comment,
    ).catch(() => {})
  }

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
