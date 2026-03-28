import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    can_approve_leaves,
    can_manage_salary,
    can_view_reports,
    can_manage_shifts,
    can_send_broadcast,
  } = body

  const { error } = await supabaseAdmin
    .from('admin_permissions')
    .upsert(
      {
        employee_id: params.id,
        can_approve_leaves: !!can_approve_leaves,
        can_manage_salary: !!can_manage_salary,
        can_view_reports: !!can_view_reports,
        can_manage_shifts: !!can_manage_shifts,
        can_send_broadcast: !!can_send_broadcast,
      },
      { onConflict: 'employee_id' }
    )

  if (error) return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  return NextResponse.json({ success: true })
}
