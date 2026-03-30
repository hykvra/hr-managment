import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptText } from '@/lib/crypto'

const ALLOWED = ['master_admin']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, is_active, push_enabled, last_sync_at, last_event_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at')

  if (error) return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  return NextResponse.json({ devices: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { device_name, ip_address, port, username, password, push_enabled } = await req.json()

  if (!ip_address?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'IP address and password are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('hikvision_devices')
    .insert({
      tenant_id:    tenantId,
      device_name:  device_name?.trim() || 'Office Terminal',
      ip_address:   ip_address.trim(),
      port:         port ?? 80,
      username:     username?.trim() || 'admin',
      password_enc: encryptText(password),
      push_enabled: push_enabled ?? true,
    })
    .select('id, device_name, ip_address, port, username, is_active, push_enabled, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A device with this IP already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to add device' }, { status: 500 })
  }

  return NextResponse.json({ device: data }, { status: 201 })
}
