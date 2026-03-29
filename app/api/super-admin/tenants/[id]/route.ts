import { NextRequest, NextResponse } from 'next/server'
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { plan, status, max_employees, company_name } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (plan) updates.plan = plan
  if (status) updates.status = status
  if (max_employees !== undefined) updates.max_employees = Number(max_employees)
  if (company_name?.trim()) updates.company_name = company_name.trim()

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete — just suspend
  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to suspend tenant' }, { status: 500 })
  return NextResponse.json({ success: true })
}
