import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

const ALLOWED = ['master_admin', 'manager']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 })
  return NextResponse.json({ leave_types: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { name, annual_quota, carry_forward_enabled, max_carry_forward, color } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (typeof annual_quota !== 'number' || annual_quota < 0) {
    return NextResponse.json({ error: 'Invalid annual quota' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      annual_quota,
      carry_forward_enabled: carry_forward_enabled ?? false,
      max_carry_forward: max_carry_forward ?? 0,
      color: color || '#6366f1',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A leave type with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 })
  }

  await activityLog({
    action: 'leave_type_created',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'leave_type',
    entity_name: name.trim(),
  })

  return NextResponse.json({ leave_type: data })
}
