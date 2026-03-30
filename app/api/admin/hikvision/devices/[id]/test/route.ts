import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/crypto'
import { hikTestConnection } from '@/lib/hikvision'
import { forwardToProxy } from '@/lib/hik-forward'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { data: device } = await supabaseAdmin
    .from('hikvision_devices')
    .select('ip_address, port, username, password_enc, proxy_url')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

  // Forward through local proxy if device has proxy_url configured
  if (device.proxy_url && process.env.HIK_PROXY_SECRET) {
    const proxied = await forwardToProxy(
      device.proxy_url,
      process.env.HIK_PROXY_SECRET,
      '/test',
      { device_id: params.id },
    )
    const data = await proxied.json()
    return NextResponse.json(data, { status: proxied.status })
  }

  try {
    const info = await hikTestConnection({
      ip:       device.ip_address,
      port:     device.port,
      username: device.username,
      password: decryptText(device.password_enc),
    })
    return NextResponse.json({ success: true, info })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 })
  }
}
