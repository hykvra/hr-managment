'use client'

import { useState, useEffect } from 'react'
import { Download, ChevronDown, ChevronRight, BarChart2, Users, UserPlus, UserMinus, CalendarDays, Wallet, UserCog, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type PayrollSummary = {
  month: string
  total_gross: number
  total_net: number
  employee_count: number
  paid_count: number
  draft_count: number
}

type PayrollRecord = {
  id: string
  month: string
  base_salary: number
  payable_days: number
  gross_salary: number
  penalty_deduction: number
  advance_deduction: number
  bonus: number
  net_salary: number
  days_present: number
  days_half: number
  days_double: number
  days_absent: number
  days_uninformed: number
  days_leave: number
  status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employees: any
}

type AttRow = {
  employee_id: string
  first_name: string
  last_name: string
  employee_code: string | null
  days_present: number
  days_half: number
  days_double: number
  days_absent: number
  days_uninformed: number
  days_leave: number
  total_recorded: number
  effective_days: number
  present_pct: number
}

type StaffRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  employee_code: string | null
  role: string
  joining_date: string
  base_salary: number
  gender: string
  dob: string
  blood_group: string
  is_active: boolean
  resignation_status: boolean
  shifts: { name: string } | null
}

type AdvanceRow = {
  id: string
  amount: number
  approved_amount: number | null
  reason: string
  status: string
  manager_comment: string | null
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null; base_salary: number }
}

type LeaveBalanceEmployee = {
  employee_id: string
  first_name: string
  last_name: string
  employee_code: string | null
  total_remaining: number
  leave_balance: number
  leave_types: {
    leave_type_id: string
    leave_type_name: string
    color: string
    annual_quota: number
    accrued: number
    used: number
    carry_forward: number
    remaining: number
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function monthLabel(dateStr: string) {
  const d = new Date(dateStr)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function fmtMoney(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function fmtDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function StatCard({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg px-3 py-2">
      <p className="text-zinc-500 text-[10px]">{label}</p>
      <p className={`font-bold text-lg ${cls}`}>{value}</p>
    </div>
  )
}

// ── Payroll Summary Tab ────────────────────────────────────────────────────────

function PayrollSummaryTab() {
  const [summary, setSummary] = useState<PayrollSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, PayrollRecord[]>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/reports/payroll')
      .then(r => r.json())
      .then(({ summary: data }) => setSummary(data || []))
      .finally(() => setLoading(false))
  }, [])

  async function loadDetail(month: string) {
    if (details[month]) { setExpanded(expanded === month ? null : month); return }
    setLoadingDetail(month)
    try {
      const res = await fetch(`/api/admin/reports/payroll?month=${month}`)
      const { records } = await res.json() as { records: PayrollRecord[] }
      setDetails(d => ({ ...d, [month]: records }))
      setExpanded(month)
    } finally { setLoadingDetail(null) }
  }

  function exportMonth(month: string) {
    const recs = details[month] || []
    const header = ['Employee', 'Code', 'Base Salary', 'Payable Days', 'Gross', 'Penalty', 'Advance', 'Bonus', 'Net', 'Status']
    const rows = recs.map(r => {
      const emp = r.employees as { first_name: string; last_name: string; employee_code: string | null }
      return [
        `${emp?.first_name || ''} ${emp?.last_name || ''}`,
        emp?.employee_code || '',
        r.base_salary, r.payable_days,
        Math.round(r.gross_salary), Math.round(r.penalty_deduction),
        Math.round(r.advance_deduction), Math.round(r.bonus),
        Math.round(r.net_salary), r.status,
      ].map(String)
    })
    downloadCSV([header, ...rows], `payroll-${month}.csv`)
  }

  function exportAll() {
    const header = ['Month', 'Employees', 'Total Gross', 'Total Net', 'Paid', 'Draft']
    const rows = summary.map(s => [
      monthLabel(s.month), s.employee_count,
      Math.round(s.total_gross), Math.round(s.total_net),
      s.paid_count, s.draft_count,
    ].map(String))
    downloadCSV([header, ...rows], 'payroll-summary-all.csv')
  }

  const totalDisbursed = summary.reduce((s, m) => s + m.total_net, 0)
  const totalMonths = summary.length

  if (loading) return <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Months" value={String(totalMonths)} cls="text-white" />
        <StatCard label="Total Disbursed" value={fmtMoney(totalDisbursed)} cls="text-green-400" />
        <StatCard label="Avg / Month" value={totalMonths > 0 ? fmtMoney(totalDisbursed / totalMonths) : '—'} cls="text-blue-400" />
      </div>

      {summary.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No payroll records yet</div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 gap-1" onClick={exportAll}>
              <Download className="w-3 h-3" /> Export All CSV
            </Button>
          </div>
          <div className="space-y-2">
            {summary.map(s => {
              const isOpen = expanded === s.month
              const recs = details[s.month] || []
              return (
                <div key={s.month} className="bg-zinc-800 rounded-lg overflow-hidden">
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700/40 transition-colors"
                    onClick={() => loadDetail(s.month)}>
                    <div className="shrink-0 text-zinc-400">
                      {loadingDetail === s.month
                        ? <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500 border-t-white animate-spin" />
                        : isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{monthLabel(s.month)}</p>
                      <p className="text-zinc-500 text-[10px] mt-0.5">{s.employee_count} employees · {s.paid_count} paid · {s.draft_count} draft</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm">{fmtMoney(s.total_net)}</p>
                      <p className="text-zinc-600 text-[10px]">gross {fmtMoney(s.total_gross)}</p>
                    </div>
                  </button>
                  {isOpen && recs.length > 0 && (
                    <div className="border-t border-zinc-700/50">
                      <div className="flex justify-end px-3 py-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-zinc-400 gap-1" onClick={() => exportMonth(s.month)}>
                          <Download className="w-3 h-3" /> CSV
                        </Button>
                      </div>
                      <div className="overflow-x-auto pb-2">
                        <table className="w-full text-xs px-3">
                          <thead>
                            <tr className="border-b border-zinc-700/50">
                              {['Employee','P','H','D','U','L','A','Payable','Gross','−Pen','−Adv','+Bonus','Net','Status'].map(h => (
                                <th key={h} className="text-left text-zinc-500 font-medium pb-1.5 pr-3 pl-3 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-700/30">
                            {recs.map(r => {
                              const emp = r.employees as { first_name: string; last_name: string; employee_code: string | null }
                              return (
                                <tr key={r.id}>
                                  <td className="py-1.5 pr-3 pl-3 whitespace-nowrap">
                                    <span className="text-zinc-200">{emp?.first_name} {emp?.last_name}</span>
                                    {emp?.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{emp.employee_code}</span>}
                                  </td>
                                  <td className="py-1.5 pr-3 text-green-400">{r.days_present}</td>
                                  <td className="py-1.5 pr-3 text-yellow-400">{r.days_half}</td>
                                  <td className="py-1.5 pr-3 text-blue-400">{r.days_double}</td>
                                  <td className="py-1.5 pr-3 text-red-400">{r.days_uninformed}</td>
                                  <td className="py-1.5 pr-3 text-purple-400">{r.days_leave}</td>
                                  <td className="py-1.5 pr-3 text-zinc-500">{r.days_absent}</td>
                                  <td className="py-1.5 pr-3 text-zinc-300">{r.payable_days}</td>
                                  <td className="py-1.5 pr-3 text-zinc-300">{fmtMoney(r.gross_salary)}</td>
                                  <td className="py-1.5 pr-3 text-red-400">{r.penalty_deduction > 0 ? fmtMoney(r.penalty_deduction) : '—'}</td>
                                  <td className="py-1.5 pr-3 text-yellow-400">{r.advance_deduction > 0 ? fmtMoney(r.advance_deduction) : '—'}</td>
                                  <td className="py-1.5 pr-3 text-green-400">{r.bonus > 0 ? fmtMoney(r.bonus) : '—'}</td>
                                  <td className="py-1.5 pr-3 font-bold text-white">{fmtMoney(r.net_salary)}</td>
                                  <td className="py-1.5 pr-3">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>{r.status}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Attendance Tab ─────────────────────────────────────────────────────────────

function AttendanceTab() {
  const [month, setMonth] = useState(currentMonthStr())
  const [rows, setRows] = useState<AttRow[]>([])
  const [daysInMonth, setDaysInMonth] = useState(30)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load(m: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/attendance?month=${m}`)
      if (res.ok) {
        const { rows: data, days_in_month } = await res.json() as { rows: AttRow[]; days_in_month: number }
        setRows(data || [])
        setDaysInMonth(days_in_month)
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Employee', 'Code', 'Present', 'Half Day', 'Double', 'Uninformed', 'Leave', 'Absent', 'Recorded', 'Eff. Days', 'Present %']
    const csvRows = rows.map(r => [
      `${r.first_name} ${r.last_name}`, r.employee_code || '',
      r.days_present, r.days_half, r.days_double, r.days_uninformed,
      r.days_leave, r.days_absent, r.total_recorded, r.effective_days, `${r.present_pct}%`,
    ].map(String))
    const [y, m] = month.split('-')
    downloadCSV([header, ...csvRows], `attendance-${MONTHS[Number(m) - 1]}-${y}.csv`)
  }

  const totals = rows.reduce((acc, r) => ({
    present: acc.present + r.days_present, half: acc.half + r.days_half,
    double: acc.double + r.days_double, uninformed: acc.uninformed + r.days_uninformed,
    leave: acc.leave + r.days_leave, absent: acc.absent + r.days_absent,
  }), { present: 0, half: 0, double: 0, uninformed: 0, leave: 0, absent: 0 })

  const avgPct = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.present_pct, 0) / rows.length) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs whitespace-nowrap">Month</label>
          <input type="month" value={month}
            onChange={e => { setMonth(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={() => load(month)}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {loaded && rows.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatCard label="Present" value={String(totals.present)} cls="text-green-400" />
          <StatCard label="Half Day" value={String(totals.half)} cls="text-yellow-400" />
          <StatCard label="Double" value={String(totals.double)} cls="text-blue-400" />
          <StatCard label="Uninformed" value={String(totals.uninformed)} cls="text-red-400" />
          <StatCard label="Leave" value={String(totals.leave)} cls="text-purple-400" />
          <StatCard label="Team Avg %" value={`${avgPct}%`} cls={avgPct >= 80 ? 'text-green-400' : avgPct >= 60 ? 'text-yellow-400' : 'text-red-400'} />
        </div>
      )}
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Select a month and click Load Report</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No attendance data for this month</div>}
      {loaded && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Employee', 'P', 'H', 'D', 'U', 'L', 'A', 'Recorded', 'Eff.Days', 'Attendance %'].map(h => (
                  <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map(r => (
                <tr key={r.employee_id}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="text-zinc-200">{r.first_name} {r.last_name}</span>
                    {r.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employee_code}</span>}
                  </td>
                  <td className="py-2 pr-3 text-green-400 font-medium">{r.days_present}</td>
                  <td className="py-2 pr-3 text-yellow-400">{r.days_half}</td>
                  <td className="py-2 pr-3 text-blue-400">{r.days_double}</td>
                  <td className="py-2 pr-3 text-red-400">{r.days_uninformed}</td>
                  <td className="py-2 pr-3 text-purple-400">{r.days_leave}</td>
                  <td className="py-2 pr-3 text-zinc-500">{r.days_absent}</td>
                  <td className="py-2 pr-3 text-zinc-400">{r.total_recorded}/{daysInMonth}</td>
                  <td className="py-2 pr-3 text-zinc-300">{r.effective_days}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.present_pct >= 80 ? 'bg-green-500' : r.present_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(r.present_pct, 100)}%` }} />
                      </div>
                      <span className={`font-medium ${r.present_pct >= 80 ? 'text-green-400' : r.present_pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{r.present_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Staff Details Tab ──────────────────────────────────────────────────────────

function StaffTab() {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/reports/staff?${params}`)
      if (res.ok) {
        const { employees } = await res.json()
        setRows(employees || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Name', 'Code', 'Email', 'Mobile', 'Role', 'Gender', 'DOB', 'Joining Date', 'Base Salary', 'Shift', 'Status']
    const csvRows = rows.map(r => [
      `${r.first_name} ${r.last_name}`, r.employee_code || '', r.email, r.mobile,
      r.role, r.gender, fmtDate(r.dob), fmtDate(r.joining_date),
      Math.round(r.base_salary), r.shifts?.name || '', r.is_active ? 'Active' : 'Inactive',
    ].map(String))
    downloadCSV([header, ...csvRows], `staff-details-${status}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={e => { setStatus(e.target.value); setLoaded(false) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email / code…"
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={load}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Click Load Report to view staff details</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No staff found</div>}
      {loaded && rows.length > 0 && (
        <>
          <p className="text-zinc-500 text-xs">{rows.length} employee{rows.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Employee', 'Email', 'Mobile', 'Role', 'Shift', 'Joining Date', 'Base Salary', 'Status'].map(h => (
                    <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="text-zinc-200">{r.first_name} {r.last_name}</span>
                      {r.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employee_code}</span>}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">{r.email}</td>
                    <td className="py-2 pr-4 text-zinc-400">{r.mobile}</td>
                    <td className="py-2 pr-4">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">{r.role}</span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">{r.shifts?.name || '—'}</td>
                    <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{fmtDate(r.joining_date)}</td>
                    <td className="py-2 pr-4 text-green-400 font-medium">{fmtMoney(r.base_salary)}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${r.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Joining Report Tab ─────────────────────────────────────────────────────────

function JoiningTab() {
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/joining?from=${from}&to=${to}`)
      if (res.ok) {
        const { employees } = await res.json()
        setRows(employees || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Name', 'Code', 'Email', 'Mobile', 'Role', 'Joining Date', 'Base Salary', 'Shift']
    const csvRows = rows.map(r => [
      `${r.first_name} ${r.last_name}`, r.employee_code || '', r.email, r.mobile,
      r.role, fmtDate(r.joining_date), Math.round(r.base_salary), r.shifts?.name || '',
    ].map(String))
    downloadCSV([header, ...csvRows], `joining-report-${from}-to-${to}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs">From</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs">To</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={load}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Select a date range and click Load Report</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No new joiners in this period</div>}
      {loaded && rows.length > 0 && (
        <>
          <p className="text-zinc-500 text-xs">{rows.length} new joiner{rows.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Employee', 'Email', 'Mobile', 'Role', 'Joining Date', 'Base Salary', 'Shift'].map(h => (
                    <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="text-zinc-200">{r.first_name} {r.last_name}</span>
                      {r.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employee_code}</span>}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">{r.email}</td>
                    <td className="py-2 pr-4 text-zinc-400">{r.mobile}</td>
                    <td className="py-2 pr-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">{r.role}</span></td>
                    <td className="py-2 pr-4 text-green-400 font-medium whitespace-nowrap">{fmtDate(r.joining_date)}</td>
                    <td className="py-2 pr-4 text-green-400 font-medium">{fmtMoney(r.base_salary)}</td>
                    <td className="py-2 pr-4 text-zinc-400">{r.shifts?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Exit Report Tab ────────────────────────────────────────────────────────────

function ExitTab() {
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo] = useState(`${now.getFullYear()}-12-31`)
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/exits?from=${from}&to=${to}`)
      if (res.ok) {
        const { employees } = await res.json()
        setRows(employees || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Name', 'Code', 'Email', 'Role', 'Joining Date', 'Resignation Date', 'Last Working Day', 'Status']
    const csvRows = (rows as StaffRow[]).map(r => [
      `${r.first_name} ${r.last_name}`, r.employee_code || '', r.email, r.role,
      fmtDate(r.joining_date), fmtDate((r as unknown as {resignation_date: string}).resignation_date || ''), fmtDate((r as unknown as {last_working_date: string}).last_working_date || ''),
      (r as unknown as {resignation_status: boolean}).resignation_status ? 'Resigned' : 'Deactivated',
    ].map(String))
    downloadCSV([header, ...csvRows], `exit-report-${from}-to-${to}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs">From</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs">To</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={load}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Select a date range and click Load Report</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No exits in this period</div>}
      {loaded && rows.length > 0 && (
        <>
          <p className="text-zinc-500 text-xs">{rows.length} exit{rows.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Employee', 'Email', 'Role', 'Joined', 'Resigned', 'Last Day', 'Reason'].map(h => (
                    <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {(rows as (StaffRow & { resignation_date?: string; last_working_date?: string; resignation_status?: boolean })[]).map(r => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="text-zinc-200">{r.first_name} {r.last_name}</span>
                      {r.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employee_code}</span>}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">{r.email}</td>
                    <td className="py-2 pr-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">{r.role}</span></td>
                    <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{fmtDate(r.joining_date)}</td>
                    <td className="py-2 pr-4 text-red-400 whitespace-nowrap">{r.resignation_date ? fmtDate(r.resignation_date) : '—'}</td>
                    <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{r.last_working_date ? fmtDate(r.last_working_date) : '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${r.resignation_status ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                        {r.resignation_status ? 'Resigned' : 'Deactivated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Leave Balance Tab ──────────────────────────────────────────────────────────

function LeaveBalanceTab() {
  const [rows, setRows] = useState<LeaveBalanceEmployee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string; color: string }[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/leave-balances?year=${year}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.employees || [])
        setLeaveTypes(data.leave_types || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const typeNames = leaveTypes.map(lt => lt.name)
    const header = ['Employee', 'Code', ...typeNames.flatMap(n => [`${n} Quota`, `${n} Used`, `${n} Remaining`]), 'Total Remaining']
    const csvRows = rows.map(r => {
      const typeCols = typeNames.flatMap(name => {
        const t = r.leave_types.find(x => x.leave_type_name === name)
        return t ? [t.annual_quota, t.used, t.remaining] : [0, 0, 0]
      })
      return [`${r.first_name} ${r.last_name}`, r.employee_code || '', ...typeCols, r.total_remaining].map(String)
    })
    downloadCSV([header, ...csvRows], `leave-balances-${year}.csv`)
  }

  const hasCustomTypes = leaveTypes.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs">Year</label>
          <input type="number" value={year} onChange={e => { setYear(Number(e.target.value)); setLoaded(false) }}
            min={2020} max={2030}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={load}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Click Load Report to view leave balances</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No employees found</div>}
      {loaded && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">Employee</th>
                {hasCustomTypes ? leaveTypes.map(lt => (
                  <th key={lt.id} className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: lt.color }} />
                      {lt.name}
                    </div>
                    <div className="text-zinc-600 text-[9px] font-normal">Used / Total</div>
                  </th>
                )) : (
                  <th className="text-left text-zinc-500 font-medium pb-2 pr-4">Leave Balance</th>
                )}
                <th className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">Total Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map(r => (
                <tr key={r.employee_id}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className="text-zinc-200">{r.first_name} {r.last_name}</span>
                    {r.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employee_code}</span>}
                  </td>
                  {hasCustomTypes ? r.leave_types.map(lt => (
                    <td key={lt.leave_type_id} className="py-2 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, lt.annual_quota > 0 ? (lt.used / lt.annual_quota) * 100 : 0)}%`, backgroundColor: lt.color }} />
                        </div>
                        <span className="text-zinc-400">{lt.used}<span className="text-zinc-600">/{lt.annual_quota}</span></span>
                      </div>
                      <div className="text-zinc-300 text-[10px] mt-0.5">{lt.remaining} left</div>
                    </td>
                  )) : (
                    <td className="py-2 pr-4 text-zinc-300">{r.leave_balance} days</td>
                  )}
                  <td className="py-2 pr-4 font-bold text-white">{r.total_remaining} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Advances Report Tab ────────────────────────────────────────────────────────

function AdvancesTab() {
  const [rows, setRows] = useState<AdvanceRow[]>([])
  const [totalRequested, setTotalRequested] = useState(0)
  const [totalApproved, setTotalApproved] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('all')
  const [month, setMonth] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status })
      if (month) params.set('month', month)
      const res = await fetch(`/api/admin/reports/advances?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.advances || [])
        setTotalRequested(data.total_requested || 0)
        setTotalApproved(data.total_approved || 0)
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Employee', 'Code', 'Base Salary', 'Requested', 'Approved Amount', 'Reason', 'Status', 'Comment', 'Date']
    const csvRows = rows.map(r => [
      `${r.employees.first_name} ${r.employees.last_name}`,
      r.employees.employee_code || '',
      Math.round(r.employees.base_salary),
      Math.round(r.amount),
      r.approved_amount ? Math.round(r.approved_amount) : '',
      r.reason, r.status,
      r.manager_comment || '',
      new Date(r.created_at).toLocaleDateString('en-IN'),
    ].map(String))
    downloadCSV([header, ...csvRows], `advances-report.csv`)
  }

  const statusColor = (s: string) => s === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : s === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={e => { setStatus(e.target.value); setLoaded(false) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input type="month" value={month} onChange={e => { setMonth(e.target.value); setLoaded(false) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={load}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto" onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {loaded && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Records" value={String(rows.length)} cls="text-white" />
          <StatCard label="Total Requested" value={fmtMoney(totalRequested)} cls="text-yellow-400" />
          <StatCard label="Total Approved" value={fmtMoney(totalApproved)} cls="text-green-400" />
        </div>
      )}
      {!loaded && !loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Select filters and click Load Report</div>}
      {loading && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>}
      {loaded && rows.length === 0 && <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No advance records found</div>}
      {loaded && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Employee', 'Requested', 'Approved', 'Reason', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className="text-zinc-200">{r.employees.first_name} {r.employees.last_name}</span>
                    {r.employees.employee_code && <span className="text-zinc-600 ml-1 font-mono text-[10px]">#{r.employees.employee_code}</span>}
                  </td>
                  <td className="py-2 pr-4 text-yellow-400 font-medium">{fmtMoney(r.amount)}</td>
                  <td className="py-2 pr-4 text-green-400 font-medium">{r.approved_amount ? fmtMoney(r.approved_amount) : '—'}</td>
                  <td className="py-2 pr-4 text-zinc-400 max-w-[180px] truncate">{r.reason}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── MIS Dashboard Tab ─────────────────────────────────────────────────────────

type MISData = {
  headcount: number
  avgSalary: number
  totalSalaryBill: number
  leavesTaken: number
  advancesOutstanding: number
  resignationsCount: number
  pendingCount: number
  payrollNetTotal: number
  payrollPaidCount: number
  payrollTotalCount: number
  deptBreakdown: Record<string, number>
  typeBreakdown: Record<string, number>
  presentToday: number
  absentToday: number
  markedToday: number
  month: string
  today: string
}

function MISDashboardTab() {
  const [data, setData]       = useState<MISData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports/mis')
      if (res.ok) {
        setData(await res.json())
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  const typeLabels: Record<string, string> = {
    regular: 'Regular', contractual: 'Contractual', daily_wage: 'Daily Wage',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : loaded ? 'Refresh' : 'Load MIS Dashboard'}
        </Button>
        {loaded && data && (
          <span className="text-zinc-500 text-xs">
            As of {new Date(data.today).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {!loaded && !loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
          Click Load MIS Dashboard to view live summary
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      )}

      {loaded && data && (
        <>
          {/* Primary KPIs */}
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Workforce</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Headcount"    value={String(data.headcount)}          cls="text-white" />
              <StatCard label="Avg Base Salary"    value={fmtMoney(data.avgSalary)}         cls="text-blue-400" />
              <StatCard label="Monthly Salary Bill" value={fmtMoney(data.totalSalaryBill)} cls="text-purple-400" />
              <StatCard label="Pending Approvals"  value={String(data.pendingCount)}        cls="text-yellow-400" />
            </div>
          </div>

          {/* This month */}
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
              This Month ({data.month})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Leaves Taken"        value={String(data.leavesTaken)}                         cls="text-orange-400" />
              <StatCard label="Advances Outstanding" value={fmtMoney(data.advancesOutstanding)}              cls="text-red-400" />
              <StatCard label="Resignations"         value={String(data.resignationsCount)}                  cls="text-red-400" />
              <StatCard label="Payroll Disbursed"    value={data.payrollPaidCount > 0 ? fmtMoney(data.payrollNetTotal) : '—'} cls="text-green-400" />
            </div>
          </div>

          {/* Today attendance */}
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Today&apos;s Attendance</p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Present"    value={String(data.presentToday)} cls="text-green-400" />
              <StatCard label="Absent"     value={String(data.absentToday)}  cls="text-red-400" />
              <StatCard label="Not Marked" value={String(data.headcount - data.markedToday)} cls="text-zinc-400" />
            </div>
          </div>

          {/* Breakdown grids */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Department breakdown */}
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
              <p className="text-zinc-400 text-xs font-medium">By Department</p>
              {Object.keys(data.deptBreakdown).length === 0 ? (
                <p className="text-zinc-600 text-xs">No department data</p>
              ) : (
                Object.entries(data.deptBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => {
                    const pct = data.headcount > 0 ? Math.round((count / data.headcount) * 100) : 0
                    return (
                      <div key={dept}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-zinc-300 truncate">{dept}</span>
                          <span className="text-zinc-400 ml-2 shrink-0">{count} · {pct}%</span>
                        </div>
                        <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            {/* Employment-type breakdown */}
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
              <p className="text-zinc-400 text-xs font-medium">By Employment Type</p>
              {Object.entries(data.typeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = data.headcount > 0 ? Math.round((count / data.headcount) * 100) : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-zinc-300">{typeLabels[type] || type}</span>
                        <span className="text-zinc-400">{count} · {pct}%</span>
                      </div>
                      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Reports component ─────────────────────────────────────────────────────

const TABS = [
  { id: 'mis',           label: 'MIS Dashboard',  Icon: TrendingUp    },
  { id: 'payroll',       label: 'Payroll',        Icon: BarChart2     },
  { id: 'attendance',    label: 'Attendance',     Icon: Users         },
  { id: 'staff',         label: 'Staff Details',  Icon: UserCog       },
  { id: 'joining',       label: 'Joining',        Icon: UserPlus      },
  { id: 'exits',         label: 'Exits',          Icon: UserMinus     },
  { id: 'leave-balance', label: 'Leave Balance',  Icon: CalendarDays  },
  { id: 'advances',      label: 'Advances',       Icon: Wallet        },
] as const

type TabId = (typeof TABS)[number]['id']

export function Reports() {
  const [active, setActive] = useState<TabId>('mis')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              active === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {active === 'mis'          && <MISDashboardTab />}
      {active === 'payroll'       && <PayrollSummaryTab />}
      {active === 'attendance'    && <AttendanceTab />}
      {active === 'staff'         && <StaffTab />}
      {active === 'joining'       && <JoiningTab />}
      {active === 'exits'         && <ExitTab />}
      {active === 'leave-balance' && <LeaveBalanceTab />}
      {active === 'advances'      && <AdvancesTab />}
    </div>
  )
}
