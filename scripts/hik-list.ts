/**
 * scripts/hik-list.ts
 *
 * Lists all employees currently registered on the Hikvision device.
 * Run from office terminal:  npm run hik-list
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { decryptText } from '../lib/crypto'
import { hikListUsers } from '../lib/hikvision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const tenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'

  const { data: tenant } = await supabase
    .from('tenants').select('id, company_name').eq('slug', tenantSlug).single()

  if (!tenant) { console.error('✗ Tenant not found'); process.exit(1) }

  const { data: devices } = await supabase
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, password_enc')
    .eq('tenant_id', tenant.id).eq('is_active', true)

  if (!devices?.length) { console.error('✗ No active devices found'); process.exit(1) }

  for (const device of devices) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`  Device : ${device.device_name} (${device.ip_address})`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    const dev = {
      ip: device.ip_address, port: device.port,
      username: device.username, password: decryptText(device.password_enc),
    }

    const users = await hikListUsers(dev)

    if (!users.length) {
      console.log('  No employees registered on this device.\n')
      continue
    }

    console.log(`  ${'#'.padEnd(6)} ${'Employee No'.padEnd(15)} Name`)
    console.log(`  ${'─'.repeat(50)}`)
    users.forEach((u, i) => {
      console.log(`  ${String(i + 1).padEnd(6)} ${(u.employeeNo ?? '').padEnd(15)} ${u.name ?? '—'}`)
    })

    console.log(`\n  Total: ${users.length} employees on device`)
    console.log(`\n  ℹ️  Use these Employee No values as "Employee Code"`)
    console.log(`     when adding staff in Admin → Employees.\n`)
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
