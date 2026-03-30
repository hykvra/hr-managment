/**
 * GET  — list user mappings for this device
 * POST — sync all active HR employees to the device + save mappings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/crypto'
import { hikAddUser } from '@/lib/hikvision'
import { forwardToProxy } from '@/lib/hik-forward'

const ALLOWED = ['master_admin']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { data: mappings } = await supabaseAdmin
    .from('hikvision_user_mapping')
    .select('id, hik_employee_no, synced_at, employees(first_name, last_name, employee_code)')
    .eq('device_id', params.id)
    .eq('tenant_id', tenantId)
    .order('created_at')

  return NextResponse.json({ mappings: mappings ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
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

  // Forward through local proxy if device has proxy_url configured
  if (device.proxy_url && process.env.HIK_PROXY_SECRET) {
    const proxied = await forwardToProxy(
      device.proxy_url,
      process.env.HIK_PROXY_SECRET,
      '/sync-employees',
      { device_id: params.id },
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

  // Get all active employees
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'eq', 'master_admin')

  if (!employees?.length) return NextResponse.json({ synced: 0 })

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const emp of employees) {
    const employeeNo = emp.employee_code ?? emp.id.slice(0, 8)
    const name = `${emp.first_name} ${emp.last_name}`

    try {
      await hikAddUser(dev, { employeeNo, name })

      // Upsert mapping
      await supabaseAdmin.from('hikvision_user_mapping').upsert({
        tenant_id:      tenantId,
        device_id:      params.id,
        employee_id:    emp.id,
        hik_employee_no: employeeNo,
        synced_at:      new Date().toISOString(),
      }, { onConflict: 'device_id,employee_id' })

      synced++
    } catch (err) {
      failed++
      errors.push(`${name}: ${String(err).slice(0, 80)}`)
    }
  }

  return NextResponse.json({ synced, failed, errors })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { mapping_id } = await req.json()
  await supabaseAdmin.from('hikvision_user_mapping')
    .delete()
    .eq('id', mapping_id)
    .eq('device_id', params.id)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ success: true })
}
