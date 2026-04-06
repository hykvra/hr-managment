/**
 * Hikvision ISAPI client
 *
 * Handles HTTP Digest Auth (RFC 2617) manually — no extra dependencies.
 * All methods throw on network/auth failure; callers should try/catch.
 */

import { createHash, randomBytes } from 'crypto'

// ── Digest Auth helpers ───────────────────────────────────────────────────────

function md5(s: string): string {
  return createHash('md5').update(s).digest('hex')
}

function parseWWWAuth(header: string) {
  const get = (key: string) => header.match(new RegExp(`${key}="([^"]+)"`))?.[1] ?? ''
  const qopRaw = header.match(/qop=([^,\s"]+)/)?.[1] ?? ''
  return {
    realm:  get('realm'),
    nonce:  get('nonce'),
    opaque: get('opaque'),
    qop:    qopRaw || get('qop'),
  }
}

function buildDigestHeader(
  username: string, password: string,
  method: string, uri: string,
  realm: string, nonce: string, qop: string, opaque: string,
): string {
  const ha1 = md5(`${username}:${realm}:${password}`)
  const ha2 = md5(`${method}:${uri}`)
  const nc  = '00000001'
  const cnonce = randomBytes(8).toString('hex')

  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`)

  let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}"`
  if (qop)    header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
  header += `, response="${response}"`
  if (opaque) header += `, opaque="${opaque}"`
  return header
}

// ── Core fetch with auto Digest ───────────────────────────────────────────────

export interface HikDevice {
  ip: string
  port: number
  username: string
  password: string
}

export async function hikFetch(
  dev: HikDevice,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base   = `http://${dev.ip}:${dev.port}`
  const url    = `${base}${path}`
  const method = (init.method ?? 'GET').toUpperCase()

  // ── 1st request — expect 401 ──────────────────────────────────────────────
  const first = await fetch(url, { ...init, method, headers: { ...(init.headers ?? {}), Connection: 'close' } })
  if (first.status !== 401) return first

  const wwwAuth = first.headers.get('www-authenticate') ?? ''
  const { realm, nonce, qop, opaque } = parseWWWAuth(wwwAuth)
  const authHeader = buildDigestHeader(dev.username, dev.password, method, path, realm, nonce, qop, opaque)

  // ── 2nd request — with Digest header ─────────────────────────────────────
  return fetch(url, {
    ...init,
    method,
    headers: { ...(init.headers ?? {}), Authorization: authHeader, Connection: 'close' },
  })
}

// ── XML value extractor (avoids xml2js dependency) ────────────────────────────

export function xmlVal(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))?.[1]?.trim() ?? ''
}

// ── ISAPI methods ─────────────────────────────────────────────────────────────

/** Test connectivity — returns device info string or throws */
export async function hikTestConnection(dev: HikDevice): Promise<string> {
  const res = await hikFetch(dev, '/ISAPI/System/deviceInfo', { method: 'GET' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const model    = xmlVal(xml, 'model')    || xmlVal(xml, 'deviceName')
  const firmware = xmlVal(xml, 'firmwareVersion')
  const serial   = xmlVal(xml, 'serialNumber')
  return `${model} · FW ${firmware} · S/N ${serial}`
}

/** Pull attendance events between two ISO timestamps */
export async function hikPullEvents(
  dev: HikDevice,
  startTime: string,
  endTime: string,
  maxResults = 100,
): Promise<HikEvent[]> {
  const body = JSON.stringify({
    AcsEventCond: {
      searchID: Date.now().toString(),
      searchResultPosition: 0,
      maxResults,
      major: 0,
      minor: 0,
      startTime,
      endTime,
      picEnable: false,
    },
  })

  const res = await hikFetch(dev, '/ISAPI/AccessControl/AcsEvent?format=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) throw new Error(`Pull events HTTP ${res.status}`)

  const json = await res.json() as { AcsEvent?: { InfoList?: HikEventRaw[] } }
  return (json.AcsEvent?.InfoList ?? []).map(normaliseEvent)
}

/** Push an employee record to the device */
export async function hikAddUser(dev: HikDevice, user: {
  employeeNo: string
  name: string
  beginTime?: string
  endTime?: string
}): Promise<void> {
  const body = JSON.stringify({
    UserInfo: {
      employeeNo: user.employeeNo,
      name: user.name,
      userType: 'normal',
      gender: 'male',
      doorRight: '1',
      RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
      Valid: {
        enable: true,
        beginTime: user.beginTime ?? '2020-01-01T00:00:00',
        endTime:   user.endTime   ?? '2030-12-31T23:59:59',
        timeType: 'local',
      },
      localUIRight: false,
      maxOpenDoorTime: 0,
      userVerifyMode: '',
    },
  })

  const res = await hikFetch(dev, '/ISAPI/AccessControl/UserInfo/Record?format=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Add user HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
}

/** List all users registered on the device */
export async function hikListUsers(dev: HikDevice): Promise<HikUserRaw[]> {
  const body = JSON.stringify({
    UserInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 500 },
  })
  const res = await hikFetch(dev, '/ISAPI/AccessControl/UserInfo/Search?format=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) throw new Error(`List users HTTP ${res.status}`)
  const json = await res.json() as { UserInfoSearch?: { UserInfo?: HikUserRaw[] } }
  return json.UserInfoSearch?.UserInfo ?? []
}

/** Delete a user from the device by employeeNo */
export async function hikDeleteUser(dev: HikDevice, employeeNo: string): Promise<void> {
  const body = JSON.stringify({ UserInfoDetail: { mode: 'byEmployeeNo', EmployeeNoList: [{ employeeNo }] } })
  await hikFetch(dev, '/ISAPI/AccessControl/UserInfoDetail/Delete?format=json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

/** Configure the device to push events to our server */
export async function hikConfigurePush(dev: HikDevice, pushUrl: string): Promise<void> {
  const urlObj = new URL(pushUrl)
  const isHttps = urlObj.protocol === 'https:'
  const defaultPort = isHttps ? 443 : 80
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification>
  <id>1</id>
  <url>${urlObj.pathname}</url>
  <protocolType>${isHttps ? 'HTTPS' : 'HTTP'}</protocolType>
  <addressingFormatType>ipaddress</addressingFormatType>
  <ipAddress>${urlObj.hostname}</ipAddress>
  <portNo>${urlObj.port || defaultPort}</portNo>
  <parameterFormatType>XML</parameterFormatType>
  <httpAuthenticationMethod>none</httpAuthenticationMethod>
</HttpHostNotification>`

  const res = await hikFetch(dev, '/ISAPI/Event/notification/httpHosts/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/xml' },
    body,
  })
  if (!res.ok) throw new Error(`Configure push HTTP ${res.status}`)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HikEvent {
  employeeNo: string
  employeeName: string
  cardNo: string
  attendanceStatus: string  // checkIn | checkOut | breakIn | breakOut | overtimeIn | overtimeOut
  verifyMode: string        // face | card | fingerprint | etc.
  time: string              // ISO string
}

interface HikEventRaw {
  employeeNoString?: string
  name?: string
  cardNo?: string
  attendanceStatus?: string
  verifyMode?: string
  currentVerifyMode?: string
  time?: string
}

function normaliseEvent(r: HikEventRaw): HikEvent {
  return {
    employeeNo:       r.employeeNoString ?? '',
    employeeName:     r.name ?? '',
    cardNo:           r.cardNo ?? '',
    attendanceStatus: r.attendanceStatus ?? '',
    verifyMode:       r.currentVerifyMode ?? r.verifyMode ?? '',
    time:             r.time ?? new Date().toISOString(),
  }
}

export interface HikUserRaw {
  employeeNo?: string
  name?: string
  userType?: string
}

// ── XML push event parser (for incoming device push requests) ─────────────────

/** Parse a raw XML push payload from the device into a HikEvent */
export function parseXmlEvent(xml: string): HikEvent | null {
  const eventType = xmlVal(xml, 'eventType')
  if (eventType !== 'AccessControllerEvent' && !xml.includes('<AccessControllerEvent>')) return null

  return {
    employeeNo:       xmlVal(xml, 'employeeNoString'),
    employeeName:     xmlVal(xml, 'name'),
    cardNo:           xmlVal(xml, 'cardNo'),
    attendanceStatus: xmlVal(xml, 'attendanceStatus'),
    verifyMode:       xmlVal(xml, 'currentVerifyMode') || xmlVal(xml, 'verifyMode'),
    time:             xmlVal(xml, 'dateTime') || new Date().toISOString(),
  }
}

// ── Map attendance status → HR attendance status ──────────────────────────────

export function hikStatusToHRStatus(
  hikStatus: string,
  eventTime: Date,
): 'Present' | 'HalfDay' | null {
  if (!hikStatus || hikStatus === 'undefined') return null

  // checkOut / breakOut / overtimeOut don't trigger a new attendance record
  if (['checkOut', 'breakOut', 'overtimeOut'].includes(hikStatus)) return null

  // Check if event is after 13:00 local → half day
  const hour = eventTime.getHours()
  if (['checkIn', 'overtimeIn'].includes(hikStatus)) {
    return hour >= 13 ? 'HalfDay' : 'Present'
  }

  return 'Present'
}
