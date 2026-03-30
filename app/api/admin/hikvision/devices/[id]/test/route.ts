import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/crypto'
import { hikTestConnection } from '@/lib/hikvision'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { data: device } = await supabaseAdmin
    .from('hikvision_devices')
    .select('ip_address, port, username, password_enc')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

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
