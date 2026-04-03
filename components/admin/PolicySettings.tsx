'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { parseBranding } from '@/lib/branding'
import { LeaveTypesManager } from './LeaveTypesManager'
import { HolidayCalendar } from './HolidayCalendar'

type CompanySetting = { setting_key: string; setting_value: string }

type ManagerData = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  admin_permissions: {
    can_approve_leaves: boolean
    can_manage_salary: boolean
    can_view_reports: boolean
    can_manage_shifts: boolean
    can_send_broadcast: boolean
  } | null
}

interface Props {
  companySettings: CompanySetting[]
  managers: ManagerData[]
}

const PERMISSION_LABELS: { key: keyof NonNullable<ManagerData['admin_permissions']>; label: string }[] = [
  { key: 'can_approve_leaves', label: 'Leaves' },
  { key: 'can_manage_salary', label: 'Salary' },
  { key: 'can_view_reports', label: 'Reports' },
  { key: 'can_manage_shifts', label: 'Shifts' },
  { key: 'can_send_broadcast', label: 'Broadcast' },
]

export function PolicySettings({ companySettings, managers }: Props) {
  const router = useRouter()

  // Company settings state
  const getSetting = (key: string) => companySettings.find(s => s.setting_key === key)?.setting_value || ''

  // ── Policy settings ──────────────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    max_leaves_per_day: getSetting('max_leaves_per_day'),
    advance_max_percent: getSetting('advance_max_percent'),
    penalty_multiplier: getSetting('penalty_multiplier'),
    timezone: getSetting('timezone') || 'Asia/Kolkata',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  // ── Branding settings ────────────────────────────────────────────────────────
  const initialBranding = parseBranding(companySettings)
  const [brandName, setBrandName] = useState(getSetting('brand_name') || '')
  const [brandColor, setBrandColor] = useState(getSetting('brand_color') || '#2563eb')
  const [brandInitials, setBrandInitials] = useState(getSetting('brand_initials') || '')
  const [savingBranding, setSavingBranding] = useState(false)
  const [brandingMsg, setBrandingMsg] = useState('')

  // Live preview — falls back to auto-initials when field is blank
  const previewInitials = brandInitials.trim() || initialBranding.initials
  const previewName = brandName.trim() || initialBranding.name

  async function saveBranding() {
    setSavingBranding(true); setBrandingMsg('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            brand_name: brandName.trim(),
            brand_color: brandColor,
            brand_initials: brandInitials.trim().slice(0, 2).toUpperCase(),
          },
        }),
      })
      if (res.ok) {
        setBrandingMsg('Saved — refresh the page to see the header update')
        setTimeout(() => setBrandingMsg(''), 4000)
        router.refresh()
      } else {
        const d = await res.json()
        setBrandingMsg(d.error || 'Failed to save')
      }
    } finally {
      setSavingBranding(false)
    }
  }

  async function saveSettings() {
    setSavingSettings(true); setSettingsMsg('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) {
        setSettingsMsg('Saved')
        setTimeout(() => setSettingsMsg(''), 3000)
        router.refresh()
      }
    } finally {
      setSavingSettings(false)
    }
  }

  // Manager permissions state
  type PermFlags = NonNullable<ManagerData['admin_permissions']>
  const [perms, setPerms] = useState<Record<string, PermFlags>>(() => {
    const initial: Record<string, PermFlags> = {}
    managers.forEach(m => {
      initial[m.id] = m.admin_permissions ?? {
        can_approve_leaves: false,
        can_manage_salary: false,
        can_view_reports: false,
        can_manage_shifts: false,
        can_send_broadcast: false,
      }
    })
    return initial
  })
  const [savingPerms, setSavingPerms] = useState<Record<string, boolean>>({})
  const [permMsgs, setPermMsgs] = useState<Record<string, string>>({})

  async function savePermissions(managerId: string) {
    setSavingPerms(p => ({ ...p, [managerId]: true }))
    try {
      const res = await fetch(`/api/admin/permissions/${managerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perms[managerId]),
      })
      if (res.ok) {
        setPermMsgs(m => ({ ...m, [managerId]: 'Saved' }))
        setTimeout(() => setPermMsgs(m => ({ ...m, [managerId]: '' })), 2000)
        router.refresh()
      }
    } finally {
      setSavingPerms(p => ({ ...p, [managerId]: false }))
    }
  }

  const inputCls = 'bg-zinc-800 border-zinc-700 text-white h-8 text-sm w-24'

  return (
    <div className="space-y-6">
      {/* ── Branding ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-zinc-300 text-sm font-medium mb-3">Portal Branding</p>
        <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
          {/* Live preview */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 w-fit">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: brandColor || '#2563eb' }}
            >
              <span className="text-white font-bold text-xs leading-none">
                {previewInitials.slice(0, 2) || 'HR'}
              </span>
            </div>
            <span className="text-white text-xs font-semibold">{previewName}</span>
            <span className="text-zinc-500 text-xs ml-1">← live preview</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Company display name</Label>
              <Input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="bg-zinc-900 border-zinc-700 text-white h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Logo initials (1–2 chars)</Label>
              <Input
                value={brandInitials}
                onChange={e => setBrandInitials(e.target.value.slice(0, 2))}
                placeholder="Auto from name"
                className="bg-zinc-900 border-zinc-700 text-white h-8 text-sm"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Brand colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-9 h-8 rounded cursor-pointer border border-zinc-700 bg-zinc-900 p-0.5"
                />
                <Input
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  placeholder="#2563eb"
                  className="bg-zinc-900 border-zinc-700 text-white h-8 text-sm w-28 font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" disabled={savingBranding} onClick={saveBranding} className="text-xs">
              {savingBranding ? 'Saving…' : 'Save Branding'}
            </Button>
            {brandingMsg && (
              <span className={`text-xs ${brandingMsg.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                {brandingMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-zinc-700" />

      {/* Company Settings */}
      <div>
        <p className="text-zinc-300 text-sm font-medium mb-3">Leave & Payroll Policy</p>
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-zinc-300 text-xs">Max Leaves Per Day</Label>
              <p className="text-zinc-500 text-xs">Max employees on leave simultaneously</p>
            </div>
            <Input type="number" value={settings.max_leaves_per_day}
              onChange={e => setSettings(s => ({ ...s, max_leaves_per_day: e.target.value }))}
              className={inputCls} />
          </div>
          <Separator className="bg-zinc-700" />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-zinc-300 text-xs">Advance Max %</Label>
              <p className="text-zinc-500 text-xs">Max advance as % of base salary</p>
            </div>
            <Input type="number" value={settings.advance_max_percent}
              onChange={e => setSettings(s => ({ ...s, advance_max_percent: e.target.value }))}
              className={inputCls} />
          </div>
          <Separator className="bg-zinc-700" />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-zinc-300 text-xs">Penalty Multiplier</Label>
              <p className="text-zinc-500 text-xs">Uninformed absence deduction multiplier</p>
            </div>
            <Input type="number" step="0.5" value={settings.penalty_multiplier}
              onChange={e => setSettings(s => ({ ...s, penalty_multiplier: e.target.value }))}
              className={inputCls} />
          </div>
          <Separator className="bg-zinc-700" />
          {/* Timezone */}
          <div className="space-y-3 pt-2">
            <h3 className="text-white text-sm font-semibold">Date &amp; Time</h3>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Timezone</label>
              <select
                value={settings.timezone || 'Asia/Kolkata'}
                onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
                className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata — IST (UTC+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai — GST (UTC+4:00)</option>
                <option value="Asia/Karachi">Asia/Karachi — PKT (UTC+5:00)</option>
                <option value="Asia/Dhaka">Asia/Dhaka — BST (UTC+6:00)</option>
                <option value="Asia/Singapore">Asia/Singapore — SGT (UTC+8:00)</option>
                <option value="Asia/Bangkok">Asia/Bangkok — ICT (UTC+7:00)</option>
                <option value="Europe/London">Europe/London — GMT/BST (UTC+0/+1)</option>
                <option value="America/New_York">America/New_York — EST/EDT (UTC-5/-4)</option>
                <option value="America/Los_Angeles">America/Los_Angeles — PST/PDT (UTC-8/-7)</option>
                <option value="UTC">UTC (UTC+0)</option>
              </select>
              <p className="text-zinc-600 text-[10px]">Used for attendance time calculations and reports</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" disabled={savingSettings} onClick={saveSettings} className="text-xs">
              {savingSettings ? 'Saving…' : 'Save Policy'}
            </Button>
            {settingsMsg && <span className="text-green-400 text-xs">{settingsMsg}</span>}
          </div>
        </div>
      </div>

      <Separator className="bg-zinc-700" />

      {/* Leave Types */}
      <div>
        <p className="text-zinc-300 text-sm font-medium mb-1">Leave Types</p>
        <p className="text-zinc-500 text-xs mb-3">Define the types of leave available to your employees. Employees can only select from these types when applying for leave.</p>
        <div className="bg-zinc-800 rounded-lg p-4">
          <LeaveTypesManager />
        </div>
      </div>

      <Separator className="bg-zinc-700" />

      {/* Holiday Calendar */}
      <div>
        <p className="text-zinc-300 text-sm font-medium mb-1">Holiday Calendar</p>
        <p className="text-zinc-500 text-xs mb-3">Add company holidays. Employees cannot apply for leave on these dates — they are automatically treated as paid days off.</p>
        <div className="bg-zinc-800 rounded-lg p-4">
          <HolidayCalendar />
        </div>
      </div>

      {/* Manager Permissions */}
      {managers.length > 0 && (
        <>
          <Separator className="bg-zinc-800" />
          <div>
            <p className="text-zinc-300 text-sm font-medium mb-3">Manager Permissions</p>
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(5,auto)_auto] gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-700">
                <span className="text-zinc-500 text-xs">Manager</span>
                {PERMISSION_LABELS.map(p => (
                  <span key={p.key} className="text-zinc-500 text-xs text-center w-14">{p.label}</span>
                ))}
                <span />
              </div>
              {managers.map(m => (
                <div key={m.id} className="grid grid-cols-[1fr_repeat(5,auto)_auto] gap-2 items-center px-4 py-3 border-b border-zinc-700/50 last:border-0">
                  <div>
                    <p className="text-white text-xs font-medium">{m.first_name} {m.last_name}</p>
                    {m.employee_code && <p className="text-zinc-500 text-xs font-mono">#{m.employee_code}</p>}
                  </div>
                  {PERMISSION_LABELS.map(p => (
                    <div key={p.key} className="flex items-center justify-center w-14">
                      <input
                        type="checkbox"
                        checked={perms[m.id]?.[p.key] ?? false}
                        onChange={e => setPerms(prev => ({
                          ...prev,
                          [m.id]: { ...prev[m.id], [p.key]: e.target.checked },
                        }))}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pl-2">
                    <Button size="sm" className="h-6 text-xs px-2"
                      disabled={savingPerms[m.id]} onClick={() => savePermissions(m.id)}>
                      {savingPerms[m.id] ? '…' : 'Save'}
                    </Button>
                    {permMsgs[m.id] && <span className="text-green-400 text-xs">{permMsgs[m.id]}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
