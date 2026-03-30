/**
 * POST /api/admin/hikvision/devices/[id]/sync
 *
 * Pulls attendance events from the device for the last N hours (default 24h)
 * and upserts them into hikvision_events + updates attendance records.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/crypto'
import { hikPullEvents, hikStatusToHRStatus } from '@/lib/hikvision'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  // How many hours back to pull (default 24, max 168 = 7 days)
  const { hours = 24 } = await req.json().catch(() => ({})) as { hours?: number }
  const safeHours = Math.min(Math.max(1, hours), 168)

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

  const endTime   = new Date()
  const startTime = new Date(endTime.getTime() - safeHours * 3_600_000)

  const toISO = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '+00:00')

  let events
  try {
    events = await hikPullEvents(dev, toISO(startTime), toISO(endTime), 500)
  } catch (err) {
    return NextResponse.json({ error: `Device unreachable: ${String(err)}` }, { status: 502 })
  }

  if (!events.length) {
    await supabaseAdmin.from('hikvision_devices').update({ last_sync_at: new Date().toISOString() }).eq('id', device.id)
    return NextResponse.json({ imported: 0, skipped: 0 })
  }

  // Load user mapping for this device
  const { data: mappings } = await supabaseAdmin
    .from('hikvision_user_mapping')
    .select('hik_employee_no, employee_id')
    .eq('device_id', device.id)
  const empMap = Object.fromEntries((mappings ?? []).map(m => [m.hik_employee_no, m.employee_id]))

  let imported = 0
  let skipped  = 0

  for (const ev of events) {
    if (!ev.employeeNo) { skipped++; continue }

    const eventTime = new Date(ev.time)
    const dateStr   = eventTime.toISOString().split('T')[0]
    const employeeId = empMap[ev.employeeNo] ?? null

    // Insert event (ignore duplicates by event_time + employee)
    const { error: evErr } = await supabaseAdmin.from('hikvision_events').insert({
      tenant_id:         tenantId,
      device_id:         device.id,
      hik_employee_no:   ev.employeeNo,
      employee_id:       employeeId,
      event_time:        eventTime.toISOString(),
      attendance_status: ev.attendanceStatus,
      verify_mode:       ev.verifyMode,
      card_no:           ev.cardNo || null,
      employee_name:     ev.employeeName || null,
      processed:         employeeId !== null,
    })

    if (evErr?.code === '23505') { skipped++; continue } // duplicate

    if (employeeId) {
      const hrStatus = hikStatusToHRStatus(ev.attendanceStatus, eventTime)
      if (hrStatus) {
        const { data: existing } = await supabaseAdmin
          .from('attendance')
          .select('status')
          .eq('employee_id', employeeId)
          .eq('date', dateStr)
          .maybeSingle()

        if (!existing) {
          await supabaseAdmin.from('attendance').insert({
            tenant_id: tenantId, employee_id: employeeId, date: dateStr, status: hrStatus,
          }).select()
        } else if (['Absent', 'Uninformed'].includes(existing.status)) {
          await supabaseAdmin.from('attendance')
            .update({ status: hrStatus })
            .eq('employee_id', employeeId).eq('date', dateStr)
        }
      }
    }
    imported++
  }

  await supabaseAdmin.from('hikvision_devices')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', device.id)

  return NextResponse.json({ imported, skipped, total: events.length })
}
