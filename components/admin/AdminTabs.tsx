'use client'

import { useState } from 'react'
import {
  Users, CalendarCheck, Banknote, Ticket, Clock, Megaphone, Settings, Wallet,
  UserCog, BarChart2, CreditCard, HandCoins, Building2, Receipt, AlertTriangle,
  Upload, Activity, Star, CalendarDays, LogOut, Cpu,
  ChevronDown, ChevronRight, Menu, X, LucideIcon, ArrowRight,
} from 'lucide-react'
import { EmployeeApprovals }    from './EmployeeApprovals'
import { LeaveManagement }      from './LeaveManagement'
import { AdvanceManagement }    from './AdvanceManagement'
import { TicketManagement }     from './TicketManagement'
import { ShiftManagement }      from './ShiftManagement'
import { BroadcastPanel }       from './BroadcastPanel'
import { PolicySettings }       from './PolicySettings'
import { PayrollRun }           from './PayrollRun'
import { EmployeeManagement }   from './EmployeeManagement'
import { Reports }              from './Reports'
import { BillingPanel }         from './BillingPanel'
import { LoanManagement }       from './LoanManagement'
import { DepartmentsPanel }     from './DepartmentsPanel'
import { ExpenseManagement }    from './ExpenseManagement'
import { WarningLetters }       from './WarningLetters'
import { BulkImportPanel }      from './BulkImportPanel'
import { ActivityLogViewer }    from './ActivityLogViewer'
import { PerformanceReviews }   from './PerformanceReviews'
import { LeaveBalancesPanel }   from './LeaveBalancesPanel'
import { ResignationManagement } from './ResignationManagement'
import { HikvisionPanel }       from './HikvisionPanel'
import { CelebrationsWidget }   from './CelebrationsWidget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── Types ─────────────────────────────────────────────────────────────────────

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

type CelebrationAlert = {
  type: 'birthday' | 'anniversary'
  employee_id: string; first_name: string; last_name: string
  employee_code: string | null; profile_photo: string | null
  days_away: number; years?: number
}

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
  celebrationsToday?: CelebrationAlert[]
  celebrationsUpcoming?: CelebrationAlert[]
  trialBanner?: { daysLeft: number; urgent: boolean } | null
}

// ── Tab + group config ────────────────────────────────────────────────────────

const TAB_CONFIG = [
  { id: 'approvals',    label: 'Approvals',    Icon: Users,        masterOnly: true  },
  { id: 'employees',    label: 'Employees',    Icon: UserCog,      masterOnly: true  },
  { id: 'departments',  label: 'Departments',  Icon: Building2,    masterOnly: true  },
  { id: 'leaves',       label: 'Leaves',       Icon: CalendarCheck, perm: 'can_approve_leaves' },
  { id: 'shifts',       label: 'Shifts',       Icon: Clock,         perm: 'can_manage_shifts'  },
  { id: 'leave_balances',label:'Leave Bal.',   Icon: CalendarDays,  masterOnly: true  },
  { id: 'hikvision',    label: 'Hikvision',    Icon: Cpu,           masterOnly: true  },
  { id: 'advances',     label: 'Advances',     Icon: Banknote,      perm: 'can_manage_salary'  },
  { id: 'loans',        label: 'Loans',        Icon: HandCoins,     masterOnly: true  },
  { id: 'expenses',     label: 'Expenses',     Icon: Receipt,       perm: 'can_manage_salary' },
  { id: 'payroll',      label: 'Payroll',      Icon: Wallet,        masterOnly: true  },
  { id: 'tickets',      label: 'Tickets',      Icon: Ticket,        alwaysManager: true },
  { id: 'broadcasts',   label: 'Broadcasts',   Icon: Megaphone,     perm: 'can_send_broadcast' },
  { id: 'warnings',     label: 'Warnings',     Icon: AlertTriangle, masterOnly: true  },
  { id: 'resignations', label: 'Resignations', Icon: LogOut,        masterOnly: true  },
  { id: 'import',       label: 'Import',       Icon: Upload,        masterOnly: true  },
  { id: 'performance',  label: 'Reviews',      Icon: Star,          masterOnly: true  },
  { id: 'reports',      label: 'Reports',      Icon: BarChart2,     masterOnly: true  },
  { id: 'activity_log', label: 'Audit Log',    Icon: Activity,      masterOnly: true  },
  { id: 'settings',     label: 'Settings',     Icon: Settings,      masterOnly: true  },
  { id: 'billing',      label: 'Billing',      Icon: CreditCard,    masterOnly: true  },
] as const

type TabId = (typeof TAB_CONFIG)[number]['id']

type NavGroup = {
  id: string
  label: string
  Icon: LucideIcon
  tabIds: TabId[]
}

const NAV_GROUPS: NavGroup[] = [
  { id: 'people',    label: 'People',         Icon: Users,         tabIds: ['approvals', 'employees', 'departments'] },
  { id: 'time',      label: 'Time & Leave',   Icon: CalendarCheck, tabIds: ['leaves', 'shifts', 'leave_balances', 'hikvision'] },
  { id: 'finance',   label: 'Finance',        Icon: Banknote,      tabIds: ['advances', 'loans', 'expenses', 'payroll'] },
  { id: 'comms',     label: 'Communication',  Icon: Megaphone,     tabIds: ['tickets', 'broadcasts'] },
  { id: 'compliance',label: 'Compliance',     Icon: AlertTriangle, tabIds: ['warnings', 'resignations', 'import', 'performance'] },
  { id: 'insights',  label: 'Insights',       Icon: BarChart2,     tabIds: ['reports', 'activity_log'] },
  { id: 'system',    label: 'System',         Icon: Settings,      tabIds: ['settings', 'billing'] },
]

// ── Sidebar nav ───────────────────────────────────────────────────────────────

function SidebarNav({
  visibleTabs, counts, active, setActive, collapsed, setCollapsed, mobile, onClose,
}: {
  visibleTabs: (typeof TAB_CONFIG)[number][]
  counts: Partial<Record<TabId, number>>
  active: TabId
  setActive: (id: TabId) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobile?: boolean
  onClose?: () => void
}) {
  const visibleIds = new Set(visibleTabs.map(t => t.id))
  const tabMap = Object.fromEntries(TAB_CONFIG.map(t => [t.id, t])) as Record<TabId, (typeof TAB_CONFIG)[number]>

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.id, true]))
  )

  function toggleGroup(id: string) {
    setOpenGroups(s => ({ ...s, [id]: !s[id] }))
  }

  function selectTab(id: TabId) {
    setActive(id)
    onClose?.()
  }

  return (
    <div className={`flex flex-col h-full bg-zinc-950/60 border-r border-zinc-800 transition-all duration-200 ${
      collapsed && !mobile ? 'w-12' : 'w-52'
    }`}>
      {/* Collapse toggle (desktop) */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-b border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors shrink-0"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {NAV_GROUPS.map(group => {
          const groupTabs = group.tabIds.filter(id => visibleIds.has(id))
          if (groupTabs.length === 0) return null
          const hasActive = groupTabs.includes(active)
          const isOpen = openGroups[group.id]

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => !collapsed && toggleGroup(group.id)}
                title={collapsed ? group.label : undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  hasActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <span className="flex items-center gap-2">
                  <group.Icon className="w-3.5 h-3.5 shrink-0" />
                  {!collapsed && group.label}
                </span>
                {!collapsed && (
                  isOpen
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {/* Group items */}
              {(!collapsed && isOpen) && groupTabs.map(tabId => {
                const t = tabMap[tabId]
                if (!t) return null
                const count = counts[tabId]
                const isActive = active === tabId
                return (
                  <button
                    key={tabId}
                    onClick={() => selectTab(tabId)}
                    className={`w-full flex items-center gap-2.5 pl-7 pr-3 py-2 text-xs transition-colors rounded-r-lg mr-2 ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 pl-[26px]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border-l-2 border-transparent pl-[26px]'
                    }`}
                  >
                    <t.Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left truncate">{t.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Icon-only items when collapsed */}
              {collapsed && groupTabs.map(tabId => {
                const t = tabMap[tabId]
                if (!t) return null
                const count = counts[tabId]
                const isActive = active === tabId
                return (
                  <button
                    key={tabId}
                    onClick={() => selectTab(tabId)}
                    title={t.label}
                    className={`w-full flex items-center justify-center py-2 text-xs transition-colors relative ${
                      isActive ? 'text-blue-400 bg-blue-600/15' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <t.Icon className="w-4 h-4" />
                    {count !== undefined && count > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminTabs({
  role, permissions,
  pendingEmployees, pendingLeaves, pendingAdvances, recentApprovedAdvances,
  openTickets, shifts, recentBroadcasts, companySettings, managers,
  celebrationsToday = [], celebrationsUpcoming = [], trialBanner,
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
    leaves:    pendingLeaves.length,
    advances:  pendingAdvances.length,
    tickets:   openTickets.length,
  }

  const stats = [
    { label: 'Pending Registrations', value: pendingEmployees.length,  Icon: Users,         color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Pending Leaves',        value: pendingLeaves.length,     Icon: CalendarCheck, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
    { label: 'Pending Advances',      value: pendingAdvances.length,   Icon: Banknote,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Open Tickets',          value: openTickets.length,       Icon: Ticket,        color: 'text-red-400',    bg: 'bg-red-500/10'    },
  ]

  const [active,       setActive]       = useState<TabId>(visibleTabs[0]?.id ?? 'tickets')
  const [collapsed,    setCollapsed]    = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)

  const activeLabel = TAB_CONFIG.find(t => t.id === active)?.label ?? ''

  return (
    <div className="flex flex-1 min-h-0">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-40 flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950">
              <span className="text-xs font-semibold text-zinc-300">Navigation</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarNav
              visibleTabs={visibleTabs} counts={counts}
              active={active} setActive={setActive}
              collapsed={false} setCollapsed={() => {}}
              mobile onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex shrink-0 h-full overflow-y-auto">
        <SidebarNav
          visibleTabs={visibleTabs} counts={counts}
          active={active} setActive={setActive}
          collapsed={collapsed} setCollapsed={setCollapsed}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Mobile header */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-zinc-200">{activeLabel}</span>
          </div>

          {/* Trial banner */}
          {trialBanner && (
            <div className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 border text-sm ${
              trialBanner.urgent
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 shrink-0 ${trialBanner.urgent ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>
                  {trialBanner.urgent
                    ? `Trial expires in ${trialBanner.daysLeft} day${trialBanner.daysLeft === 1 ? '' : 's'} — upgrade to keep access.`
                    : `Free trial · ${trialBanner.daysLeft} days remaining.`}
                </span>
              </div>
              <a
                href="mailto:support@hrjo.in?subject=Plan%20Upgrade%20Request"
                className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap hover:underline ${
                  trialBanner.urgent ? 'text-amber-400' : 'text-violet-400'
                }`}
              >
                Upgrade now <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Manage employees, leaves, advances, and settings</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(s => (
              <Card key={s.label} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <div className={`${s.bg} rounded p-1`}>
                      <s.Icon className={`w-3 h-3 ${s.color}`} />
                    </div>
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className={`text-3xl font-bold ${s.value > 0 ? s.color : 'text-zinc-500'}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Celebrations */}
          <CelebrationsWidget today={celebrationsToday} upcoming={celebrationsUpcoming} />

          {/* Active tab content */}
          {active === 'approvals'    && <EmployeeApprovals pendingEmployees={pendingEmployees} shifts={shifts} />}
          {active === 'employees'    && <EmployeeManagement />}
          {active === 'leaves'       && <LeaveManagement pendingLeaves={pendingLeaves} />}
          {active === 'advances'     && <AdvanceManagement pendingAdvances={pendingAdvances} recentApprovedAdvances={recentApprovedAdvances} />}
          {active === 'tickets'      && <TicketManagement openTickets={openTickets} />}
          {active === 'shifts'       && <ShiftManagement shifts={shifts} />}
          {active === 'broadcasts'   && <BroadcastPanel shifts={shifts} recentBroadcasts={recentBroadcasts} />}
          {active === 'loans'        && <LoanManagement />}
          {active === 'expenses'     && <ExpenseManagement />}
          {active === 'departments'  && <DepartmentsPanel />}
          {active === 'warnings'     && <WarningLetters />}
          {active === 'resignations' && <ResignationManagement />}
          {active === 'import'       && <BulkImportPanel onClose={() => {}} />}
          {active === 'leave_balances' && <LeaveBalancesPanel />}
          {active === 'performance'  && <PerformanceReviews />}
          {active === 'activity_log' && <ActivityLogViewer />}
          {active === 'hikvision'    && <HikvisionPanel />}
          {active === 'payroll'      && <PayrollRun />}
          {active === 'reports'      && <Reports />}
          {active === 'settings'     && <PolicySettings companySettings={companySettings} managers={managers} />}
          {active === 'billing'      && <BillingPanel />}

        </div>
      </div>

    </div>
  )
}
