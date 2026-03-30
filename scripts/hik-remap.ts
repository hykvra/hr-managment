/**
 * scripts/hik-remap.ts
 *
 * Maps portal employees to device employees by matching employee_code
 * to the Hikvision employee number — WITHOUT re-adding them to the device.
 * Also re-processes all pulled events so attendance is linked to real employees.
 *
 * Run AFTER adding real employees to the portal:
 *   npm run hik-remap
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { decryptText } from '../lib/crypto'
import { hikListUsers, hikStatusToHRStatus } from '../lib/hikvision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const tenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'

  const { data: tenant } = await supabase
    .from('tenants').select('id, company_name').eq('slug', tenantSlug).single()

  if (!tenant) { console.error('✗ Tenant not found'); process.exit(1) }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Hikvision ↔ Portal Employee Remapping`)
  console.log(`  Tenant: ${tenant.company_name}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Load portal employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .not('role', 'eq', 'attendance')

  if (!employees?.length) {
    console.error('✗ No employees in portal yet.')
    console.log('  → Add real employees in Admin → Employees first, then run this script.\n')
    process.exit(1)
  }

  // Build a lookup: employee_code → employee
  const codeMap = Object.fromEntries(
    employees
      .filter(e => e.employee_code)
      .map(e => [e.employee_code!.toLowerCase(), e])
  )

  console.log(`Portal employees: ${employees.length}`)
  console.log(`With employee codes: ${Object.keys(codeMap).length}\n`)

  // Load devices
  const { data: devices } = await supabase
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, password_enc')
    .eq('tenant_id', tenant.id).eq('is_active', true)

  if (!devices?.length) { console.error('✗ No devices found'); process.exit(1) }

  for (const device of devices) {
    console.log(`── Device: "${device.device_name}" (${device.ip_address})`)

    const dev = {
      ip: device.ip_address, port: device.port,
      username: device.username, password: decryptText(device.password_enc),
    }

    // Get users from device
    const deviceUsers = await hikListUsers(dev)
    console.log(`   ${deviceUsers.length} employees on device`)

    let mapped = 0, unmatched = 0

    for (const u of deviceUsers) {
      const empNo = u.employeeNo ?? ''
      const emp = codeMap[empNo.toLowerCase()]

      if (!emp) {
        console.log(`   ⚠ No portal match for device user: ${empNo} — ${u.name ?? ''}`)
        unmatched++
        continue
      }

      // Upsert mapping
      await supabase.from('hikvision_user_mapping').upsert({
        tenant_id:       tenant.id,
        device_id:       device.id,
        employee_id:     emp.id,
        hik_employee_no: empNo,
        synced_at:       new Date().toISOString(),
      }, { onConflict: 'device_id,employee_id' })

      console.log(`   ✓ ${empNo} → ${emp.first_name} ${emp.last_name}`)
      mapped++
    }

    console.log(`\n   Mapped: ${mapped}  |  Unmatched: ${unmatched}`)

    // ── Re-process all pulled events for this device ───────────────────────

    console.log(`\n   Re-processing pulled events...`)

    const { data: events } = await supabase
      .from('hikvision_events')
      .select('id, hik_employee_no, event_time, attendance_status')
      .eq('device_id', device.id)
      .eq('processed', false)

    // Build fresh empMap from new mappings
    const { data: newMappings } = await supabase
      .from('hikvision_user_mapping')
      .select('hik_employee_no, employee_id')
      .eq('device_id', device.id)
    const empMap = Object.fromEntries((newMappings ?? []).map(m => [m.hik_employee_no, m.employee_id]))

    let attUpdated = 0

    for (const ev of events ?? []) {
      const employeeId = empMap[ev.hik_employee_no]
      if (!employeeId) continue

      const eventTime = new Date(ev.event_time)
      const dateStr   = eventTime.toISOString().split('T')[0]

      // Mark event as processed
      await supabase.from('hikvision_events')
        .update({ employee_id: employeeId, processed: true })
        .eq('id', ev.id)

      // Update attendance
      const hrStatus = hikStatusToHRStatus(ev.attendance_status, eventTime)
      if (!hrStatus) continue

      const { data: existing } = await supabase
        .from('attendance').select('status')
        .eq('employee_id', employeeId).eq('date', dateStr).maybeSingle()

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

    console.log(`   ✓ ${attUpdated} attendance records updated from pulled events\n`)
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  Done! Check Admin → Attendance to verify.\n`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
