'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
  const [settings, setSettings] = useState({
    max_leaves_per_day: getSetting('max_leaves_per_day'),
    advance_max_percent: getSetting('advance_max_percent'),
    penalty_multiplier: getSetting('penalty_multiplier'),
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

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
          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" disabled={savingSettings} onClick={saveSettings} className="text-xs">
              {savingSettings ? 'Saving…' : 'Save Policy'}
            </Button>
            {settingsMsg && <span className="text-green-400 text-xs">{settingsMsg}</span>}
          </div>
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
