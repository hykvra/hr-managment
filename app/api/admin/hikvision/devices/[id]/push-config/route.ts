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

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { data: device } = await supabaseAdmin
    .from('hikvision_devices')
    .select('id, ip_address, port, username, password_enc')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  // Build the push URL from the request host
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const pushUrl = `${appUrl}/api/integrations/hikvision/push`

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
