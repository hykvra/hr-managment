import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function canManageShifts(role: string, userId: string, tenantId: string): Promise<boolean> {
  if (role === 'master_admin') return true
  const { data } = await supabaseAdmin
    .from('admin_permissions')
    .select('can_manage_shifts')
    .eq('employee_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as { can_manage_shifts: boolean } | null)?.can_manage_shifts === true
}

export async function GET() {
  const session = await getSession()
  if (!session || !['master_admin', 'manager', 'attendance'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('shifts')
    .select('id, name, start_time, end_time')
    .eq('tenant_id', tenantId)
    .order('name')
  return NextResponse.json({ shifts: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  if (!(await canManageShifts(session.role, session.id, tenantId))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { name, start_time, end_time } = await req.json()

  if (!name?.trim() || !start_time || !end_time) {
    return NextResponse.json({ error: 'Name, start time, and end time are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('shifts').insert({
    tenant_id: tenantId,
    name: name.trim(),
    start_time,
    end_time,
  })

  if (error) return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  return NextResponse.json({ success: true })
}
