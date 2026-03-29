import { NextRequest, NextResponse } from 'next/server'
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { superLog } from '@/lib/super-logger'

// PATCH — edit tenant
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { company_name, plan, status, max_employees } = body

  // Fetch current tenant for log context
  const { data: current } = await supabaseAdmin
    .from('tenants')
    .select('company_name, status, plan')
    .eq('id', params.id)
    .single()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (plan)                           updates.plan            = plan
  if (status)                         updates.status          = status
  if (max_employees !== undefined)    updates.max_employees   = Number(max_employees)
  if (company_name?.trim())           updates.company_name    = company_name.trim()

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })

  const action = status && status !== current?.status
    ? (status === 'suspended' ? 'suspend_tenant' : 'activate_tenant')
    : 'edit_tenant'

  await superLog({
    action,
    entity_type: 'tenant',
    entity_id: params.id,
    entity_name: company_name?.trim() ?? current?.company_name,
    details: { changes: body, previous: current },
    performed_by: session.email,
  })

  return NextResponse.json({ success: true })
}

// DELETE — permanently remove tenant and all associated data
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch tenant name before delete for the audit log
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('company_name, slug')
    .eq('id', params.id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Cascade delete in dependency order
  await supabaseAdmin.from('otp_store').delete().eq('tenant_id', params.id)
  await supabaseAdmin.from('company_settings').delete().eq('tenant_id', params.id)
  await supabaseAdmin.from('employees').delete().eq('tenant_id', params.id)

  const { error } = await supabaseAdmin.from('tenants').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 })

  await superLog({
    action: 'delete_tenant',
    entity_type: 'tenant',
    entity_id: params.id,
    entity_name: tenant.company_name,
    details: { slug: tenant.slug },
    performed_by: session.email,
  })

  return NextResponse.json({ success: true })
}
