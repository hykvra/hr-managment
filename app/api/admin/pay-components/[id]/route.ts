import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.component_name !== undefined) updates.component_name = body.component_name.trim()
  if (body.amount !== undefined) updates.amount = body.amount
  if (body.is_percentage !== undefined) updates.is_percentage = body.is_percentage
  if (body.is_active !== undefined) updates.is_active = body.is_active

  const { error } = await supabaseAdmin
    .from('employee_pay_components')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to update component' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('employee_pay_components')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Failed to delete component' }, { status: 500 })
  return NextResponse.json({ success: true })
}
