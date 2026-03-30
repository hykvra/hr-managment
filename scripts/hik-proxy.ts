/**
 * scripts/hik-proxy.ts
 *
 * Local HTTP proxy that forwards requests from the Railway-hosted portal
 * to Hikvision devices on the office LAN.
 *
 * Run from office terminal:
 *   npm run hik-proxy
 *
 * Then expose with ngrok:
 *   npx ngrok http 3001
 *   → set HIK_PROXY_URL=https://xxxx.ngrok.io in Railway env vars
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import * as http from 'http'
import { createClient } from '@supabase/supabase-js'
import { decryptText } from '../lib/crypto'
import {
  hikTestConnection,
  hikAddUser,
  hikPullEvents,
  hikConfigurePush,
  hikStatusToHRStatus,
} from '../lib/hikvision'

// ── Config ────────────────────────────────────────────────────────────────────

const PORT   = Number(process.env.HIK_PROXY_PORT ?? 3001)
const SECRET = process.env.HIK_PROXY_SECRET ?? ''

if (!SECRET) {
  console.error('✗ HIK_PROXY_SECRET is not set. Add it to .env.local.')
  process.exit(1)
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function getDevice(deviceId: string) {
  const { data, error } = await supabase
    .from('hikvision_devices')
    .select('id, device_name, ip_address, port, username, password_enc, tenant_id')
    .eq('id', deviceId)
    .single()
  if (error || !data) throw new Error('Device not found')
  return data
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleTest(body: { device_id: string }, res: http.ServerResponse) {
  const device = await getDevice(body.device_id)
  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }
  const info = await hikTestConnection(dev)
  json(res, 200, { success: true, info })
}

async function handleSyncEmployees(body: { device_id: string }, res: http.ServerResponse) {
  const device = await getDevice(body.device_id)
  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('tenant_id', device.tenant_id)
    .eq('is_active', true)
    .not('role', 'eq', 'attendance')

  if (!employees?.length) {
    return json(res, 200, { synced: 0, failed: 0, errors: [] })
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

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
      await supabase.from('hikvision_user_mapping').upsert({
        tenant_id:       device.tenant_id,
        device_id:       device.id,
        employee_id:     emp.id,
        hik_employee_no: employeeNo,
        synced_at:       new Date().toISOString(),
      }, { onConflict: 'device_id,employee_id' })
      synced++
    } catch (err) {
      failed++
      errors.push(`${name}: ${String(err).slice(0, 80)}`)
    }
  }

  json(res, 200, { synced, failed, errors })
}

async function handlePullEvents(
  body: { device_id: string; hours?: number },
  res: http.ServerResponse,
) {
  const device = await getDevice(body.device_id)
  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  const safeHours = Math.min(Math.max(1, body.hours ?? 24), 168)
  const endTime   = new Date()
  const startTime = new Date(endTime.getTime() - safeHours * 3_600_000)
  const toISO = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '+00:00')

  const events = await hikPullEvents(dev, toISO(startTime), toISO(endTime), 500)

  if (!events.length) {
    return json(res, 200, { imported: 0, skipped: 0, total: 0 })
  }

  // Load user mapping
  const { data: mappings } = await supabase
    .from('hikvision_user_mapping')
    .select('hik_employee_no, employee_id')
    .eq('device_id', device.id)
  const empMap = Object.fromEntries((mappings ?? []).map(m => [m.hik_employee_no, m.employee_id]))

  let imported = 0
  let skipped  = 0

  for (const ev of events) {
    if (!ev.employeeNo) { skipped++; continue }

    const eventTime  = new Date(ev.time)
    const dateStr    = eventTime.toISOString().split('T')[0]
    const employeeId = empMap[ev.employeeNo] ?? null

    const { error: evErr } = await supabase.from('hikvision_events').insert({
      tenant_id:         device.tenant_id,
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

    if (evErr?.code === '23505') { skipped++; continue }

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
            tenant_id: device.tenant_id, employee_id: employeeId, date: dateStr, status: hrStatus,
          })
        } else if (['Absent', 'Uninformed'].includes(existing.status)) {
          await supabase.from('attendance')
            .update({ status: hrStatus })
            .eq('employee_id', employeeId).eq('date', dateStr)
        }
      }
    }
    imported++
  }

  await supabase.from('hikvision_devices')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', device.id)

  json(res, 200, { imported, skipped, total: events.length })
}

async function handleConfigurePush(
  body: { device_id: string; push_url: string },
  res: http.ServerResponse,
) {
  const device = await getDevice(body.device_id)
  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  await hikConfigurePush(dev, body.push_url)

  await supabase.from('hikvision_devices')
    .update({ push_enabled: true })
    .eq('id', device.id)

  json(res, 200, { success: true })
}

async function handleAddUser(
  body: { device_id: string; employee_id: string },
  res: http.ServerResponse,
) {
  const device = await getDevice(body.device_id)
  const dev = {
    ip:       device.ip_address,
    port:     device.port,
    username: device.username,
    password: decryptText(device.password_enc),
  }

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('id', body.employee_id)
    .single()

  if (empErr || !emp) throw new Error('Employee not found')

  const employeeNo = emp.employee_code ?? emp.id.slice(0, 8)
  const name = `${emp.first_name} ${emp.last_name}`

  await hikAddUser(dev, {
    employeeNo,
    name,
    beginTime: '2024-01-01T00:00:00',
    endTime:   '2030-12-31T23:59:59',
  })

  await supabase.from('hikvision_user_mapping').upsert({
    tenant_id:       device.tenant_id,
    device_id:       device.id,
    employee_id:     emp.id,
    hik_employee_no: employeeNo,
    synced_at:       new Date().toISOString(),
  }, { onConflict: 'device_id,employee_id' })

  json(res, 200, { success: true })
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Auth check
  const auth = req.headers['authorization'] ?? ''
  if (auth !== `Bearer ${SECRET}`) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  // Only POST
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  let body: Record<string, unknown>
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' })
  }

  const route = req.url ?? ''

  try {
    if (route === '/test')             return await handleTest(body as { device_id: string }, res)
    if (route === '/sync-employees')   return await handleSyncEmployees(body as { device_id: string }, res)
    if (route === '/pull-events')      return await handlePullEvents(body as { device_id: string; hours?: number }, res)
    if (route === '/configure-push')   return await handleConfigurePush(body as { device_id: string; push_url: string }, res)
    if (route === '/add-user')         return await handleAddUser(body as { device_id: string; employee_id: string }, res)

    return json(res, 404, { error: 'Not found' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${route}] Error:`, msg)
    return json(res, 502, { error: msg })
  }
})

server.listen(PORT, () => {
  const preview = SECRET.slice(0, 8)
  console.log(`\n🔌 Hikvision Local Proxy running on port ${PORT}`)
  console.log(`   Secret: ${preview}... (first 8 chars)`)
  console.log(`   Ready to forward portal requests to local devices`)
  console.log(``)
  console.log(`   Next: expose with ngrok → npx ngrok http ${PORT}`)
  console.log(`   Then set HIK_PROXY_URL=https://xxxx.ngrok.io in Railway\n`)
})
