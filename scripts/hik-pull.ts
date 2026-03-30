/**
 * scripts/hik-pull.ts
 *
 * Pull ALL existing attendance events from local Hikvision device → Supabase cloud.
 * Run from your office machine (same network as the device):
 *
 *   npm run hik-pull
 *
 * Optional: pull only last N days (default = 365 days = all records):
 *   HIK_PULL_DAYS=30 npm run hik-pull
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { decryptText } from '../lib/crypto'
import { hikPullEvents, hikStatusToHRStatus } from '../lib/hikvision'

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'
  const pullDays   = Number(process.env.HIK_PULL_DAYS ?? 365)

  // ── Resolve tenant ─────────────────────────────────────────────────────────

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, company_name')
    .eq('slug', tenantSlug)
    .single()

  if (tenantErr || !tenant) {
    console.error(`✗ Could not find tenant "${tenantSlug}":`, tenantErr?.message)
    process.exit(1)
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Hikvision → Supabase Event Pull`)
  console.log(`  Tenant : ${tenant.company_name}`)
  console.log(`  Period : last ${pullDays} day${pullDays === 1 ? '' : 's'}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // ── Load devices ───────────────────────────────────────────────────────────

  const { data: devices, error: devErr } = await supabase
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, password_enc')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  if (devErr || !devices?.length) {
    console.error('✗ No active devices found. Add a device in Admin → Hikvision first.')
    process.exit(1)
  }

  // ── Load employee mapping ──────────────────────────────────────────────────

  const { data: mappings } = await supabase
    .from('hikvision_user_mapping')
    .select('hik_employee_no, employee_id')
    .eq('tenant_id', tenant.id)

  const empMap = Object.fromEntries(
    (mappings ?? []).map(m => [m.hik_employee_no, m.employee_id])
  )

  console.log(`Employee mappings loaded: ${Object.keys(empMap).length}\n`)

  // ── Time window ────────────────────────────────────────────────────────────

  const endTime   = new Date()
  const startTime = new Date(endTime.getTime() - pullDays * 86_400_000)

  console.log(`Pulling events from: ${startTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`)
  console.log(`               to  : ${endTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n`)

  // ── Pull per device ────────────────────────────────────────────────────────

  for (const device of devices) {
    console.log(`── Device: "${device.device_name}" (${device.ip_address}:${device.port})`)

    const dev = {
      ip:       device.ip_address,
      port:     device.port,
      username: device.username,
      password: decryptText(device.password_enc),
    }

    // Pull in 30-day chunks to avoid device limits
    const CHUNK_DAYS = 30
    const totalChunks = Math.ceil(pullDays / CHUNK_DAYS)
    let allEvents: Awaited<ReturnType<typeof hikPullEvents>> = []

    process.stdout.write(`   Fetching from device`)
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const chunkEnd   = new Date(endTime.getTime() - chunk * CHUNK_DAYS * 86_400_000)
      const chunkStart = new Date(chunkEnd.getTime() - CHUNK_DAYS * 86_400_000)
      if (chunkStart < startTime) chunkStart.setTime(startTime.getTime())

      try {
        const events = await hikPullEvents(dev, toISO(chunkStart), toISO(chunkEnd), 1000)
        allEvents = allEvents.concat(events)
        process.stdout.write('.')
      } catch (err) {
        process.stdout.write('✗')
        console.error(`\n   ✗ Failed to pull chunk ${chunk + 1}/${totalChunks}: ${err}`)
      }
    }
    console.log(` ${allEvents.length} events fetched`)

    if (!allEvents.length) {
      console.log('   No events found on device.\n')
      continue
    }

    // ── Save to Supabase ───────────────────────────────────────────────────────

    let imported    = 0
    let skipped     = 0
    let attUpdated  = 0

    console.log(`   Saving to Supabase cloud...`)

    for (const ev of allEvents) {
      if (!ev.employeeNo) { skipped++; continue }

      const eventTime  = new Date(ev.time)
      const dateStr    = eventTime.toISOString().split('T')[0]
      const employeeId = empMap[ev.employeeNo] ?? null

      // Insert event — skip if already exists (duplicate)
      const { error: evErr } = await supabase.from('hikvision_events').insert({
        tenant_id:         tenant.id,
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

      if (evErr?.code === '23505') { skipped++; continue } // already imported
      if (evErr) { skipped++; continue }

      imported++

      // Update attendance record
      if (employeeId) {
        const hrStatus = hikStatusToHRStatus(ev.attendanceStatus, eventTime)
        if (hrStatus) {
          const { data: existing } = await supabase
            .from('attendance')
            .select('status')
            .eq('employee_id', employeeId)
            .eq('date', dateStr)
            .maybeSingle()

          if (!existing) {
            await supabase.from('attendance').insert({
              tenant_id: tenant.id, employee_id: employeeId, date: dateStr, status: hrStatus,
            })
            attUpdated++
          } else if (['Absent', 'Uninformed'].includes(existing.status)) {
            await supabase.from('attendance')
              .update({ status: hrStatus })
              .eq('employee_id', employeeId).eq('date', dateStr)
            attUpdated++
          }
        }
      }
    }

    // Update last_sync_at
    await supabase.from('hikvision_devices')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', device.id)

    console.log(`   ✓ Events  : ${imported} imported, ${skipped} skipped (duplicates)`)
    console.log(`   ✓ Attendance: ${attUpdated} records updated\n`)
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Done! Check Admin → Hikvision → Events tab.`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

main().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
