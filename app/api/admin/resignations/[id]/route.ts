import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

const ALLOWED = ['master_admin', 'manager']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { action } = await req.json() as { action: 'accept' | 'cancel' }

  if (action === 'accept') {
    // Deactivate the employee and clear resignation_status
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ is_active: false, resignation_status: false })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: 'Failed to process resignation' }, { status: 500 })

    await activityLog({
      action: 'employee_deactivated',
      tenant_id: tenantId,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'employee',
      entity_id: params.id,
      details: { reason: 'resignation_accepted' },
    })
  } else if (action === 'cancel') {
    // Admin cancels / rejects the resignation — employee stays active
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ resignation_status: false, resignation_date: null, last_working_date: null })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: 'Failed to cancel resignation' }, { status: 500 })

    await activityLog({
      action: 'resignation_withdrawn',
      tenant_id: tenantId,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'employee',
      entity_id: params.id,
      details: { cancelled_by: 'admin' },
    })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
