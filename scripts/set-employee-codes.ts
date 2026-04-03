/**
 * scripts/set-employee-codes.ts
 * Maps portal employees to their Hikvision device employee numbers.
 * Run: npm run set-employee-codes
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tid = 'dbbbf5d3-8d07-4e02-ada7-674520a86ba1'

// Device Employee No → portal email
const MAPPING: Record<string, string> = {
  '2':  'aatifkotadiya@gmail.com',
  '3':  'khyatimosin@gmail.com',
  '4':  'asifkhanasif2314@gmail.com',
  '5':  'mohammednadeem1906@gmail.com',
  '7':  'baghadiyaaman@gmail.com',
  '9':  'shaikafsar697@gmail.com',
  '11': 'marajwdekrishna@gmail.com',
  '12': 'syedsyedanikhatfatima@gmail.com',
  '13': 'alishpanjvani80@gmail.com',
  '14': 'raghavsinghrajput1224@gmail.com',
  '16': 'alivirmani3@gmail.com',
  '18': 'shehzanhirzni1@gmail.com',
  '19': 'bunnyanandas9247@gmail.com',
  '20': 'mdost4040@gmail.com',
  '24': 'maimoonab859@gmail.com',
  '26': 'sanghaniamisha12345@gmail.com',
  '28': 'sammythakka7906@gmail.com',
  '29': 'katlamukesh2008@gmail.com',
  '30': 'amansorthiya03@gmail.com',
  '32': 'swapnildeshmukh9022@gmail.com',
  '37': 'karimkanani61@gmail.com',
  '38': 'ayankeshvani2008@gmail.com',
  '39': 'armanlakhani88@gmail.com',
  '41': 'mohammedabdul.muqeethuzefa@gmail.com',
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Setting Employee Codes from Device mapping')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let ok = 0; let fail = 0

  for (const [code, email] of Object.entries(MAPPING)) {
    const { error } = await sb.from('employees')
      .update({ employee_code: code })
      .eq('email', email)
      .eq('tenant_id', tid)
    if (error) { console.log(`  ✗ ${code.padStart(2)} ${email} — ${error.message}`); fail++ }
    else        { console.log(`  ✓ ${code.padStart(2)} → ${email}`); ok++ }
  }

  console.log(`\n  Set: ${ok}  Failed: ${fail}`)

  // Show what's still not mapped
  const { data } = await sb.from('employees')
    .select('first_name, last_name, email, employee_code')
    .eq('tenant_id', tid).eq('role', 'employee').order('first_name')

  const unmapped = data?.filter(e => !e.employee_code) ?? []
  if (unmapped.length) {
    console.log('\n  ── Not on device (no code set) ──')
    unmapped.forEach(e => console.log(`  • ${e.first_name} ${e.last_name}`))
  }
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
