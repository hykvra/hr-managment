'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Cpu, Plus, Pencil, Trash2, Wifi, RefreshCw, Users,
  ChevronDown, ChevronUp, Radio, CheckCircle2, XCircle, Clock,
  Fingerprint, AlertCircle, X, Save, Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Device = {
  id: string
  device_name: string
  ip_address: string
  port: number
  username: string
  is_active: boolean
  push_enabled: boolean
  proxy_url: string | null
  last_sync_at: string | null
  last_event_at: string | null
}

type UserMapping = {
  id: string
  hik_employee_no: string
  synced_at: string | null
  employees: { first_name: string; last_name: string; employee_code: string | null } | null
}

type HikEvent = {
  id: string
  hik_employee_no: string
  employee_name: string | null
  event_time: string
  attendance_status: string
  verify_mode: string | null
  card_no: string | null
  processed: boolean
  employees: { first_name: string; last_name: string; employee_code: string | null } | null
  hikvision_devices: { device_name: string } | null
}

type DeviceForm = {
  device_name: string
  ip_address: string
  port: string
  username: string
  password: string
  proxy_url: string
}

const BLANK_FORM: DeviceForm = {
  device_name: '', ip_address: '', port: '80', username: 'admin', password: '', proxy_url: '',
}

const STATUS_COLORS: Record<string, string> = {
  checkIn:      'bg-emerald-900/40 text-emerald-400',
  checkOut:     'bg-blue-900/40 text-blue-400',
  breakIn:      'bg-yellow-900/40 text-yellow-400',
  breakOut:     'bg-orange-900/40 text-orange-400',
  overtimeIn:   'bg-purple-900/40 text-purple-400',
  overtimeOut:  'bg-pink-900/40 text-pink-400',
}

const VERIFY_ICON: Record<string, string> = {
  faceRecognition: '👤',
  fingerprint: '👆',
  card: '💳',
  password: '🔑',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtStatus(s: string) {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

// ── Sub-component: Device Form Modal ─────────────────────────────────────────

function DeviceModal({
  initial, onSave, onClose,
}: { initial?: Device | null; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState<DeviceForm>(
    initial
      ? { device_name: initial.device_name, ip_address: initial.ip_address, port: String(initial.port), username: initial.username, password: '', proxy_url: initial.proxy_url ?? '' }
      : BLANK_FORM
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof DeviceForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr('')
    try {
      let res: Response
      const body: Record<string, unknown> = {
        device_name: form.device_name.trim(),
        ip_address:  form.ip_address.trim(),
        port:        Number(form.port),
        username:    form.username.trim(),
        proxy_url:   form.proxy_url.trim(),
      }
      if (form.password) body.password = form.password

      if (initial) {
        res = await fetch(`/api/admin/hikvision/devices/${initial.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/admin/hikvision/devices', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      onSave()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">{initial ? 'Edit Device' : 'Add Device'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: 'Device Name', key: 'device_name' as const, placeholder: 'Main Entrance', required: true },
            { label: 'IP Address',  key: 'ip_address'  as const, placeholder: '192.168.1.64', required: true },
            { label: 'Port',        key: 'port'        as const, placeholder: '80' },
            { label: 'Username',    key: 'username'    as const, placeholder: 'admin' },
            { label: initial ? 'Password (leave blank to keep)' : 'Password', key: 'password' as const, placeholder: '••••••••', type: 'password', required: !initial },
            { label: 'Local Proxy URL', key: 'proxy_url' as const, placeholder: 'https://xxxx.ngrok.io' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-zinc-400 mb-1">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                required={f.required}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
          {err && <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sub-component: Users Pane ─────────────────────────────────────────────────

function UsersPane({ device }: { device: Device }) {
  const [mappings, setMappings]   = useState<UserMapping[]>([])
  const [loading,  setLoading]    = useState(false)
  const [syncing,  setSyncing]    = useState(false)
  const [msg,      setMsg]        = useState<{ text: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/hikvision/devices/${device.id}/users`)
    const d = await r.json()
    setMappings(d.mappings ?? [])
    setLoading(false)
  }, [device.id])

  useEffect(() => { load() }, [load])

  async function syncUsers() {
    setSyncing(true); setMsg(null)
    try {
      const r = await fetch(`/api/admin/hikvision/devices/${device.id}/users`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sync failed')
      setMsg({ text: `Synced ${d.synced} users${d.failed ? `, ${d.failed} failed` : ''}`, ok: d.failed === 0 })
      load()
    } catch (e) {
      setMsg({ text: String(e), ok: false })
    } finally { setSyncing(false) }
  }

  async function removeMapping(mappingId: string) {
    await fetch(`/api/admin/hikvision/devices/${device.id}/users`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping_id: mappingId }),
    })
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">{mappings.length} mapped employees</p>
        <button
          onClick={syncUsers} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
          {syncing ? 'Syncing…' : 'Sync All Employees to Device'}
        </button>
      </div>
      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${msg.ok ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
          {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {msg.text}
        </p>
      )}
      {loading ? (
        <p className="text-xs text-zinc-500 text-center py-4">Loading…</p>
      ) : mappings.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-4">No employees synced yet. Click &ldquo;Sync All Employees&rdquo; to push HR employees to this device.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {mappings.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-medium text-white">
                  {m.employees ? `${m.employees.first_name} ${m.employees.last_name}` : 'Unknown'}
                  {m.employees?.employee_code && <span className="ml-1 text-zinc-500">#{m.employees.employee_code}</span>}
                </p>
                <p className="text-[11px] text-zinc-500">Hik ID: {m.hik_employee_no} · Synced {fmtTime(m.synced_at)}</p>
              </div>
              <button onClick={() => removeMapping(m.id)} className="text-zinc-600 hover:text-red-400 p-1 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-component: Device Card ────────────────────────────────────────────────

function DeviceCard({
  device, onEdit, onDeleted, onRefresh,
}: { device: Device; onEdit: (d: Device) => void; onDeleted: () => void; onRefresh: () => void }) {
  const [expanded,  setExpanded]  = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'events'>('users')
  const [testing,   setTesting]   = useState(false)
  const [testMsg,   setTestMsg]   = useState<{ text: string; ok: boolean } | null>(null)
  const [syncing,   setSyncing]   = useState(false)
  const [syncMsg,   setSyncMsg]   = useState<{ text: string; ok: boolean } | null>(null)
  const [pushCfg,   setPushCfg]   = useState(false)
  const [pushMsg,   setPushMsg]   = useState<{ text: string; ok: boolean } | null>(null)
  const [deleting,  setDeleting]  = useState(false)
  const [confirmDel,setConfirmDel]= useState(false)

  // Events state
  const [events,      setEvents]      = useState<HikEvent[]>([])
  const [evTotal,     setEvTotal]     = useState(0)
  const [evOffset,    setEvOffset]    = useState(0)
  const [evLoading,   setEvLoading]   = useState(false)

  const loadEvents = useCallback(async (offset = 0) => {
    setEvLoading(true)
    const r = await fetch(`/api/admin/hikvision/events?device_id=${device.id}&offset=${offset}`)
    const d = await r.json()
    setEvents(d.events ?? [])
    setEvTotal(d.total ?? 0)
    setEvOffset(offset)
    setEvLoading(false)
  }, [device.id])

  useEffect(() => {
    if (expanded && activeTab === 'events') loadEvents(0)
  }, [expanded, activeTab, loadEvents])

  async function testConnection() {
    setTesting(true); setTestMsg(null)
    try {
      const r = await fetch(`/api/admin/hikvision/devices/${device.id}/test`)
      const d = await r.json()
      setTestMsg({ text: d.success ? `✓ ${d.info}` : `✗ ${d.error}`, ok: d.success })
    } catch (e) { setTestMsg({ text: String(e), ok: false }) }
    finally { setTesting(false) }
  }

  async function syncNow() {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await fetch(`/api/admin/hikvision/devices/${device.id}/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: 24 }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sync failed')
      setSyncMsg({ text: `Imported ${d.imported}, skipped ${d.skipped} of ${d.total} events`, ok: true })
      onRefresh()
      if (activeTab === 'events') loadEvents(0)
    } catch (e) { setSyncMsg({ text: String(e), ok: false }) }
    finally { setSyncing(false) }
  }

  async function configurePush() {
    setPushCfg(true); setPushMsg(null)
    try {
      const r = await fetch(`/api/admin/hikvision/devices/${device.id}/push-config`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Configuration failed')
      setPushMsg({ text: '✓ Push mode configured on device', ok: true })
    } catch (e) { setPushMsg({ text: String(e), ok: false }) }
    finally { setPushCfg(false) }
  }

  async function deleteDevice() {
    setDeleting(true)
    await fetch(`/api/admin/hikvision/devices/${device.id}`, { method: 'DELETE' })
    onDeleted()
  }

  return (
    <div className={`border rounded-xl transition-colors ${device.is_active ? 'border-zinc-700 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/30 opacity-70'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`p-2 rounded-lg ${device.is_active ? 'bg-blue-900/40' : 'bg-zinc-800'}`}>
          <Cpu className={`w-4 h-4 ${device.is_active ? 'text-blue-400' : 'text-zinc-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{device.device_name}</p>
            {device.push_enabled && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded-full">
                <Radio className="w-2.5 h-2.5" /> Push
              </span>
            )}
            {device.proxy_url ? (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded-full">
                🔗 Proxy: {new URL(device.proxy_url).hostname.replace(/^[^.]+\./, '').replace(/\.io$/, '.io')}
              </span>
            ) : null}
            {!device.is_active && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          <p className="text-xs text-zinc-400">{device.ip_address}:{device.port} · {device.username}</p>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-zinc-500">Last sync</p>
          <p className="text-xs text-zinc-300">{fmtTime(device.last_sync_at)}</p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button onClick={testConnection} disabled={testing} title="Test connection"
            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg disabled:opacity-40">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          </button>
          <button onClick={syncNow} disabled={syncing} title="Pull events (last 24h)"
            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg disabled:opacity-40">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(device)} title="Edit"
            className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded-lg">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Inline messages */}
      {(testMsg || syncMsg || pushMsg) && (
        <div className="px-4 pb-2 space-y-1">
          {testMsg && (
            <p className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${testMsg.ok ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
              {testMsg.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {testMsg.text}
            </p>
          )}
          {syncMsg && (
            <p className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${syncMsg.ok ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'}`}>
              {syncMsg.ok ? <RefreshCw className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {syncMsg.text}
            </p>
          )}
          {pushMsg && (
            <p className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${pushMsg.ok ? 'bg-purple-900/30 text-purple-400' : 'bg-red-900/30 text-red-400'}`}>
              {pushMsg.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {pushMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Expanded pane */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
          {/* Proxy setup guide / status */}
          {!device.proxy_url ? (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300 space-y-1">
              <p className="font-medium flex items-center gap-1.5">⚠️ App is deployed remotely — direct device calls won&apos;t work.</p>
              <p className="text-amber-300/70">Run the local proxy from your office machine:</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-amber-300/80">
                <li><code className="bg-amber-900/40 px-1 rounded">npm run hik-proxy</code></li>
                <li><code className="bg-amber-900/40 px-1 rounded">npx ngrok http 3001</code></li>
                <li>Copy the <strong>https://xxxx.ngrok.io</strong> URL</li>
                <li>Edit this device → paste it as &ldquo;Local Proxy URL&rdquo;</li>
              </ol>
              <p className="text-amber-300/70 pt-0.5">Then all buttons (Test, Sync, Push Config) will work.</p>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2 text-xs text-emerald-400 flex items-center gap-2">
              🔗 Proxy connected: <span className="font-mono">{device.proxy_url}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={configurePush} disabled={pushCfg}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
            >
              {pushCfg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
              Configure Push Mode
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-900/60 text-zinc-300 hover:text-red-400 text-xs rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Device
            </button>
          </div>

          {/* Delete confirm */}
          {confirmDel && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-center justify-between gap-4">
              <p className="text-xs text-red-300">Remove <strong>{device.device_name}</strong>? This also deletes all mappings and events.</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmDel(false)} className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700">Cancel</button>
                <button onClick={deleteDevice} disabled={deleting} className="text-xs px-2 py-1 bg-red-700 rounded text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? 'Removing…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {/* Inner tabs */}
          <div className="flex gap-1 border-b border-zinc-800 pb-1">
            {(['users', 'events'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1 text-xs rounded-t font-medium capitalize ${activeTab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t === 'users' ? '👥 Users' : '📋 Events'}
              </button>
            ))}
          </div>

          {activeTab === 'users' && <UsersPane device={device} />}

          {activeTab === 'events' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">{evTotal} total events</p>
                <button onClick={() => loadEvents(0)} className="text-xs text-blue-400 hover:underline">Refresh</button>
              </div>
              {evLoading ? (
                <p className="text-xs text-zinc-500 text-center py-4">Loading…</p>
              ) : events.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No events yet. Trigger a sync or configure push mode.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-800/60 text-zinc-400">
                          <th className="px-3 py-2 text-left font-medium">Time</th>
                          <th className="px-3 py-2 text-left font-medium">Employee</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Verify</th>
                          <th className="px-3 py-2 text-center font-medium">HR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {events.map(ev => {
                          const emp = ev.employees
                          const name = emp
                            ? `${emp.first_name} ${emp.last_name}`
                            : (ev.employee_name ?? ev.hik_employee_no)
                          return (
                            <tr key={ev.id} className="hover:bg-zinc-800/30">
                              <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{fmtTime(ev.event_time)}</td>
                              <td className="px-3 py-2 text-zinc-200">{name}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[ev.attendance_status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                                  {fmtStatus(ev.attendance_status)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-zinc-400">
                                {VERIFY_ICON[ev.verify_mode ?? ''] ?? ev.verify_mode ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {ev.processed
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                                  : <Clock className="w-3.5 h-3.5 text-zinc-600 inline" />}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {evTotal > 50 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        disabled={evOffset === 0}
                        onClick={() => loadEvents(Math.max(0, evOffset - 50))}
                        className="text-xs text-blue-400 disabled:text-zinc-600 hover:underline"
                      >← Prev</button>
                      <p className="text-[11px] text-zinc-500">{evOffset + 1}–{Math.min(evOffset + 50, evTotal)} of {evTotal}</p>
                      <button
                        disabled={evOffset + 50 >= evTotal}
                        onClick={() => loadEvents(evOffset + 50)}
                        className="text-xs text-blue-400 disabled:text-zinc-600 hover:underline"
                      >Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function HikvisionPanel() {
  const [devices,  setDevices]  = useState<Device[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<Device | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/hikvision/devices')
    const d = await r.json()
    setDevices(d.devices ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(d: Device) { setEditing(d); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }
  function saved() { closeForm(); load() }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Hikvision Devices</h2>
            <p className="text-xs text-zinc-500">DS-K1T343MX face recognition terminals</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> Add Device
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-3 flex gap-3">
        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 space-y-0.5">
          <p className="font-medium">Setup Guide</p>
          <ol className="list-decimal ml-4 space-y-0.5 text-blue-300/80">
            <li>Add your device with its IP address, port 80, and admin credentials.</li>
            <li>Click <strong>Test Connection (WiFi icon)</strong> to verify reachability.</li>
            <li>Click <strong>Sync All Employees</strong> to push HR staff to the device.</li>
            <li>Click <strong>Configure Push Mode</strong> so the device auto-sends events to this portal.</li>
            <li>Or manually click <strong>Pull Events (↺)</strong> to import the last 24 h of data.</li>
          </ol>
        </div>
      </div>

      {/* Device list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-700 rounded-xl">
          <Cpu className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400 font-medium">No devices added yet</p>
          <p className="text-xs text-zinc-600 mb-4">Add your Hikvision terminal to get started.</p>
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            + Add First Device
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map(d => (
            <DeviceCard
              key={d.id}
              device={d}
              onEdit={openEdit}
              onDeleted={load}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <DeviceModal initial={editing} onSave={saved} onClose={closeForm} />
      )}
    </div>
  )
}
