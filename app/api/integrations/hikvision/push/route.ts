/**
 * POST /api/integrations/hikvision/push
 *
 * Receives real-time events pushed by the Hikvision device.
 * The device is configured via httpHosts to POST XML here.
 *
 * No session auth — device sends raw XML. We validate by matching
 * a known device IP from the DB.
 *
 * The body arrives as multipart/mixed; we extract the XML part.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseXmlEvent, hikStatusToHRStatus } from '@/lib/hikvision'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
             ?? req.headers.get('x-real-ip')
             ?? ''

    console.log(`[hik-push] Received push from IP: ${ip}, body length: ${rawBody.length}`)

    // ── Extract XML from multipart body ──────────────────────────────────────
    // Device sends multipart/mixed with XML as first part. Extract XML block.
    const xmlMatch = rawBody.match(/<\?xml[\s\S]*?<\/EventNotificationAlert>/)
    const xml = xmlMatch?.[0] ?? rawBody

    const event = parseXmlEvent(xml)
    if (!event || !event.employeeNo) {
      // Log first 500 chars of unrecognised XML to diagnose format
      console.log(`[hik-push] RAW BODY from ${ip}: ${rawBody.slice(0, 1500)}`)
      return new NextResponse(null, { status: 200 })
    }

    console.log(`[hik-push] Event: employee=${event.employeeNo} (${event.employeeName}), time=${event.time}, status=${event.attendanceStatus}`)

    // ── Look up which tenant/device this event belongs to ─────────────────────
    // Try exact IP match first; fall back to any active push-enabled device
    // (device sends from public/NAT IP which differs from stored LAN IP)
    let { data: device } = await supabaseAdmin
      .from('hikvision_devices')
      .select('id, tenant_id, is_active, push_enabled')
      .eq('ip_address', ip)
      .eq('is_active', true)
      .eq('push_enabled', true)
      .maybeSingle()

    if (!device) {
      // IP didn't match (device is behind NAT — public IP differs from LAN IP)
      // Fall back to first active push-enabled device
      const { data: fallback } = await supabaseAdmin
        .from('hikvision_devices')
        .select('id, tenant_id, is_active, push_enabled')
        .eq('is_active', true)
        .eq('push_enabled', true)
        .limit(1)
        .maybeSingle()
      device = fallback
    }

    if (!device) {
      console.warn(`[hik-push] No active push-enabled device found (source IP: ${ip})`)
      return new NextResponse(null, { status: 200 })
    }

    const tenantId = device.tenant_id
    const deviceId = device.id

    // ── Resolve employee mapping ──────────────────────────────────────────────
    const { data: mapping } = await supabaseAdmin
      .from('hikvision_user_mapping')
      .select('employee_id')
      .eq('device_id', deviceId)
      .eq('hik_employee_no', event.employeeNo)
      .maybeSingle()

    const employeeId = mapping?.employee_id ?? null

    // ── Store event ─────────────────────────────────────────────────────────────
    const eventTime = new Date(event.time)

    const { error: insertError } = await supabaseAdmin
      .from('hikvision_events')
      .insert({
        tenant_id:        tenantId,
        device_id:        deviceId,
        hik_employee_no:  event.employeeNo,
        employee_id:      employeeId,
        event_time:       eventTime.toISOString(),
        attendance_status: event.attendanceStatus,
        verify_mode:      event.verifyMode,
        card_no:          event.cardNo || null,
        employee_name:    event.employeeName || null,
        processed:        false,
      })

    if (insertError) {
      // 23505 = duplicate — expected and safe to ignore
      if (insertError.code !== '23505') {
        console.error(`[hik-push] Insert error:`, insertError)
      }
    }

    // ── Update attendance record ──────────────────────────────────────────────
    if (employeeId) {
      const hrStatus = hikStatusToHRStatus(event.attendanceStatus, eventTime)
      const dateStr = eventTime.toISOString().split('T')[0]

      if (hrStatus) {
        const { data: existing } = await supabaseAdmin
          .from('attendance')
          .select('status')
          .eq('employee_id', employeeId)
          .eq('date', dateStr)
          .maybeSingle()

        if (!existing) {
          await supabaseAdmin.from('attendance').insert({
            tenant_id:   tenantId,
            employee_id: employeeId,
            date:        dateStr,
            status:      hrStatus,
          })
        } else if (existing.status === 'Absent' || existing.status === 'Uninformed') {
          await supabaseAdmin.from('attendance')
            .update({ status: hrStatus })
            .eq('employee_id', employeeId)
            .eq('date', dateStr)
        }
      }

      // Mark event as processed + update device last_event_at
      await supabaseAdmin.from('hikvision_events')
        .update({ processed: true })
        .eq('device_id', deviceId)
        .eq('hik_employee_no', event.employeeNo)
        .eq('event_time', eventTime.toISOString())

      await supabaseAdmin.from('hikvision_devices')
        .update({ last_event_at: eventTime.toISOString() })
        .eq('id', deviceId)
    }

    console.log(`[hik-push] Stored event for employee ${event.employeeNo} at ${event.time}`)
    return new NextResponse(null, { status: 200 })
  } catch (err) {
    console.error('[hik-push] error:', err)
    return new NextResponse(null, { status: 200 }) // always 200 to prevent device retry loops
  }
}

// GET endpoint to verify the push URL is reachable
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'hikvision-push', timestamp: new Date().toISOString() })
}
