'use client'

import { useState } from 'react'
import { Users, CalendarCheck, Banknote, Ticket, Clock, Megaphone, Settings, Wallet, UserCog } from 'lucide-react'
import { EmployeeApprovals } from './EmployeeApprovals'
import { LeaveManagement } from './LeaveManagement'
import { AdvanceManagement } from './AdvanceManagement'
import { TicketManagement } from './TicketManagement'
import { ShiftManagement } from './ShiftManagement'
import { BroadcastPanel } from './BroadcastPanel'
import { PolicySettings } from './PolicySettings'
import { PayrollRun } from './PayrollRun'
import { EmployeeManagement } from './EmployeeManagement'

// ── Data types ────────────────────────────────────────────────────────────────

type PendingEmployee = {
  id: string; first_name: string; last_name: string; email: string
  mobile: string; dob: string; gender: string; profile_photo: string | null; created_at: string
}
type Shift = { id: string; name: string; start_time: string; end_time: string }
type LeaveWithEmployee = {
  id: string; leave_date: string; end_date: string | null; leave_type: string
  exception_flag: boolean; created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}
type AdvanceWithEmployee = {
  id: string; amount: number; approved_amount: number | null; reason: string
  status: string; created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null; base_salary: number }
}
type TicketWithEmployee = {
  id: string; subject: string; message: string; created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}
type BroadcastData = {
  id: string; message: string; target_shift: string; created_at: string
  employees: { first_name: string; last_name: string } | null
}
type CompanySetting = { setting_key: string; setting_value: string }
type ManagerData = {
  id: string; first_name: string; last_name: string; employee_code: string | null
  admin_permissions: {
    can_approve_leaves: boolean; can_manage_salary: boolean; can_view_reports: boolean
    can_manage_shifts: boolean; can_send_broadcast: boolean
  } | null
}
type Permissions = {
  can_approve_leaves: boolean; can_manage_salary: boolean
  can_manage_shifts: boolean; can_send_broadcast: boolean
} | null

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  role: string
  permissions: Permissions
  pendingEmployees: PendingEmployee[]
  pendingLeaves: LeaveWithEmployee[]
  pendingAdvances: AdvanceWithEmployee[]
  recentApprovedAdvances: AdvanceWithEmployee[]
  openTickets: TicketWithEmployee[]
  shifts: Shift[]
  recentBroadcasts: BroadcastData[]
  companySettings: CompanySetting[]
  managers: ManagerData[]
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TAB_CONFIG = [
  { id: 'approvals',   label: 'Approvals',  Icon: Users,        masterOnly: true  },
  { id: 'employees',   label: 'Employees',  Icon: UserCog,      masterOnly: true  },
  { id: 'leaves',      label: 'Leaves',     Icon: CalendarCheck, perm: 'can_approve_leaves' },
  { id: 'advances',    label: 'Advances',   Icon: Banknote,      perm: 'can_manage_salary'  },
  { id: 'tickets',     label: 'Tickets',    Icon: Ticket,        alwaysManager: true },
  { id: 'shifts',      label: 'Shifts',     Icon: Clock,         perm: 'can_manage_shifts'  },
  { id: 'broadcasts',  label: 'Broadcasts', Icon: Megaphone,     perm: 'can_send_broadcast' },
  { id: 'payroll',     label: 'Payroll',    Icon: Wallet,        masterOnly: true  },
  { id: 'settings',    label: 'Settings',   Icon: Settings,      masterOnly: true  },
] as const

type TabId = (typeof TAB_CONFIG)[number]['id']

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminTabs({
  role, permissions,
  pendingEmployees, pendingLeaves, pendingAdvances, recentApprovedAdvances,
  openTickets, shifts, recentBroadcasts, companySettings, managers,
}: Props) {
  const isMaster = role === 'master_admin'

  const visibleTabs = TAB_CONFIG.filter(t => {
    if (isMaster) return true
    if ('masterOnly' in t) return false
    if ('alwaysManager' in t) return true
    if ('perm' in t && t.perm && permissions) return permissions[t.perm as keyof typeof permissions]
    return false
  })

  const counts: Partial<Record<TabId, number>> = {
    approvals: pendingEmployees.length,
    leaves: pendingLeaves.length,
    advances: pendingAdvances.length,
    tickets: openTickets.length,
  }

  const [active, setActive] = useState<TabId>(visibleTabs[0]?.id ?? 'tickets')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-zinc-800">
        {visibleTabs.map(t => {
          const count = counts[t.id]
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white border-b-2 border-blue-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {active === 'approvals' && (
          <EmployeeApprovals pendingEmployees={pendingEmployees} shifts={shifts} />
        )}
        {active === 'employees' && (
          <EmployeeManagement />
        )}
        {active === 'leaves' && (
          <LeaveManagement pendingLeaves={pendingLeaves} />
        )}
        {active === 'advances' && (
          <AdvanceManagement
            pendingAdvances={pendingAdvances}
            recentApprovedAdvances={recentApprovedAdvances}
          />
        )}
        {active === 'tickets' && (
          <TicketManagement openTickets={openTickets} />
        )}
        {active === 'shifts' && (
          <ShiftManagement shifts={shifts} />
        )}
        {active === 'broadcasts' && (
          <BroadcastPanel shifts={shifts} recentBroadcasts={recentBroadcasts} />
        )}
        {active === 'payroll' && (
          <PayrollRun />
        )}
        {active === 'settings' && (
          <PolicySettings companySettings={companySettings} managers={managers} />
        )}
      </div>
    </div>
  )
}
