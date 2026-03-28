import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function canManageShifts(role: string, userId: string): Promise<boolean> {
  if (role === 'master_admin') return true
  const { data } = await supabaseAdmin
    .from('admin_permissions')
    .select('can_manage_shifts')
    .eq('employee_id', userId)
    .maybeSingle()
  return (data as { can_manage_shifts: boolean } | null)?.can_manage_shifts === true
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await canManageShifts(session.role, session.id))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { name, start_time, end_time } = await req.json()
  const updates: Record<string, string> = {}
  if (name?.trim()) updates.name = name.trim()
  if (start_time) updates.start_time = start_time
  if (end_time) updates.end_time = end_time

  const { error } = await supabaseAdmin.from('shifts').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await canManageShifts(session.role, session.id))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.from('shifts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  return NextResponse.json({ success: true })
}
