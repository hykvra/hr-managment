/**
 * POST /api/admin/hikvision/devices/[id]/push-config
 *
 * Configures the device to push attendance events to this portal via HTTP.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/crypto'
import { hikConfigurePush } from '@/lib/hikvision'
import { forwardToProxy } from '@/lib/hik-forward'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { data: device } = await supabaseAdmin
    .from('hikvision_devices')
    .select('id, ip_address, port, username, password_enc, proxy_url')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

  // Build the push URL from the app URL
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const pushUrl = `${appUrl}/api/integrations/hikvision/push`

  // Forward through local proxy if device has proxy_url configured
  if (device.proxy_url && process.env.HIK_PROXY_SECRET) {
    const proxied = await forwardToProxy(
      device.proxy_url,
      process.env.HIK_PROXY_SECRET,
      '/configure-push',
      { device_id: params.id, push_url: pushUrl },
    )
    const data = await proxied.json()
    return NextResponse.json(data, { status: proxied.status })
  }

  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  try {
    await hikConfigurePush(dev, pushUrl)

    // Mark device as push-enabled
    await supabaseAdmin
      .from('hikvision_devices')
      .update({ push_enabled: true })
      .eq('id', device.id)

    return NextResponse.json({ success: true, pushUrl })
  } catch (err) {
    return NextResponse.json({ error: `Failed to configure push: ${String(err)}` }, { status: 502 })
  }
}
