import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptText } from '@/lib/crypto'

const ALLOWED = ['master_admin']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.device_name  !== undefined) updates.device_name  = body.device_name.trim()
  if (body.ip_address   !== undefined) updates.ip_address   = body.ip_address.trim()
  if (body.port         !== undefined) updates.port         = Number(body.port)
  if (body.username     !== undefined) updates.username     = body.username.trim()
  if (body.password     !== undefined) updates.password_enc = encryptText(body.password)
  if (body.is_active    !== undefined) updates.is_active    = body.is_active
  if (body.push_enabled !== undefined) updates.push_enabled = body.push_enabled
  if (body.proxy_url   !== undefined) updates.proxy_url   = body.proxy_url === '' ? null : body.proxy_url

  const { error } = await supabaseAdmin
    .from('hikvision_devices')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  await supabaseAdmin.from('hikvision_devices').delete()
    .eq('id', params.id).eq('tenant_id', tenantId)

  return NextResponse.json({ success: true })
}
