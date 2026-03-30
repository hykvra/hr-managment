/**
 * scripts/hik-sync.ts
 *
 * Bulk employee sync to all active Hikvision devices.
 * Run from the office terminal (same LAN as devices):
 *   npm run hik-sync
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { decryptText } from '../lib/crypto'
import { hikAddUser } from '../lib/hikvision'

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'

  // Resolve tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, company_name')
    .eq('slug', tenantSlug)
    .single()

  if (tenantErr || !tenant) {
    console.error(`✗ Could not find tenant "${tenantSlug}":`, tenantErr?.message)
    process.exit(1)
  }

  console.log(`\nTenant: ${tenant.company_name} (${tenant.id})\n`)

  // Load active employees (skip attendance-only role)
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .not('role', 'eq', 'attendance')

  if (empErr) {
    console.error('✗ Failed to load employees:', empErr.message)
    process.exit(1)
  }

  if (!employees?.length) {
    console.log('No active employees found.')
    process.exit(0)
  }

  console.log(`Found ${employees.length} active employees.\n`)

  // Load active devices
  const { data: devices, error: devErr } = await supabase
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, password_enc')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  if (devErr) {
    console.error('✗ Failed to load devices:', devErr.message)
    process.exit(1)
  }

  if (!devices?.length) {
    console.log('No active Hikvision devices found.')
    process.exit(0)
  }

  // ── For each device, sync all employees ────────────────────────────────────

  for (const device of devices) {
    console.log(`\n── Device: "${device.device_name}" (${device.ip_address}:${device.port}) ──`)

    const dev = {
      ip:       device.ip_address,
      port:     device.port,
      username: device.username,
      password: decryptText(device.password_enc),
    }

    let synced = 0
    let failed = 0

    for (const emp of employees) {
      const employeeNo = emp.employee_code ?? emp.id.slice(0, 8)
      const name = `${emp.first_name} ${emp.last_name}`

      try {
        await hikAddUser(dev, {
          employeeNo,
          name,
          beginTime: '2024-01-01T00:00:00',
          endTime:   '2030-12-31T23:59:59',
        })

        // Upsert mapping
        await supabase.from('hikvision_user_mapping').upsert({
          tenant_id:       tenant.id,
          device_id:       device.id,
          employee_id:     emp.id,
          hik_employee_no: employeeNo,
          synced_at:       new Date().toISOString(),
        }, { onConflict: 'device_id,employee_id' })

        console.log(`  ✓ ${name}`)
        synced++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  ✗ ${name}: ${msg}`)
        failed++
      }
    }

    console.log(`\nDevice "${device.device_name}": ${synced} synced, ${failed} failed`)
  }

  console.log('\nDone.\n')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
