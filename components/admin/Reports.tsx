'use client'

import { useState, useEffect } from 'react'
import { Download, ChevronDown, ChevronRight, BarChart2, Users } from 'lucide-react'
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

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv, ''], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
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
      {/* Summary stats */}
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
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 gap-1"
              onClick={exportAll}>
              <Download className="w-3 h-3" /> Export All CSV
            </Button>
          </div>

          <div className="space-y-2">
            {summary.map(s => {
              const isOpen = expanded === s.month
              const recs = details[s.month] || []
              return (
                <div key={s.month} className="bg-zinc-800 rounded-lg overflow-hidden">
                  {/* Month row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700/40 transition-colors"
                    onClick={() => loadDetail(s.month)}>
                    <div className="shrink-0 text-zinc-400">
                      {loadingDetail === s.month
                        ? <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500 border-t-white animate-spin" />
                        : isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{monthLabel(s.month)}</p>
                      <p className="text-zinc-500 text-[10px] mt-0.5">
                        {s.employee_count} employees · {s.paid_count} paid · {s.draft_count} draft
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm">{fmtMoney(s.total_net)}</p>
                      <p className="text-zinc-600 text-[10px]">gross {fmtMoney(s.total_gross)}</p>
                    </div>
                  </button>

                  {/* Detail rows */}
                  {isOpen && recs.length > 0 && (
                    <div className="border-t border-zinc-700/50">
                      <div className="flex justify-end px-3 py-2">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-zinc-400 gap-1"
                          onClick={() => exportMonth(s.month)}>
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
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                      r.status === 'paid'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    }`}>{r.status}</span>
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

// ── Attendance Analytics Tab ───────────────────────────────────────────────────

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
      `${r.first_name} ${r.last_name}`,
      r.employee_code || '',
      r.days_present, r.days_half, r.days_double,
      r.days_uninformed, r.days_leave, r.days_absent,
      r.total_recorded, r.effective_days, `${r.present_pct}%`,
    ].map(String))
    const [y, m] = month.split('-')
    downloadCSV([header, ...csvRows], `attendance-${MONTHS[Number(m) - 1]}-${y}.csv`)
  }

  // Totals
  const totals = rows.reduce((acc, r) => ({
    present: acc.present + r.days_present,
    half: acc.half + r.days_half,
    double: acc.double + r.days_double,
    uninformed: acc.uninformed + r.days_uninformed,
    leave: acc.leave + r.days_leave,
    absent: acc.absent + r.days_absent,
  }), { present: 0, half: 0, double: 0, uninformed: 0, leave: 0, absent: 0 })

  const avgPct = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.present_pct, 0) / rows.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs whitespace-nowrap">Month</label>
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setLoaded(false) }}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
          disabled={loading}
          onClick={() => load(month)}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 gap-1 ml-auto"
            onClick={exportCSV}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>

      {/* Summary cards */}
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

      {!loaded && !loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
          Select a month and click Load Report
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      )}

      {/* Table */}
      {loaded && rows.length === 0 && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No attendance data for this month</div>
      )}

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
                        <div
                          className={`h-full rounded-full ${r.present_pct >= 80 ? 'bg-green-500' : r.present_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(r.present_pct, 100)}%` }}
                        />
                      </div>
                      <span className={`font-medium ${r.present_pct >= 80 ? 'text-green-400' : r.present_pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.present_pct}%
                      </span>
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

// ── Stat card helper ───────────────────────────────────────────────────────────

function StatCard({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg px-3 py-2">
      <p className="text-zinc-500 text-[10px]">{label}</p>
      <p className={`font-bold text-lg ${cls}`}>{value}</p>
    </div>
  )
}

// ── Main Reports component ─────────────────────────────────────────────────────

const TABS = [
  { id: 'payroll', label: 'Payroll Summary', Icon: BarChart2 },
  { id: 'attendance', label: 'Attendance', Icon: Users },
] as const

export function Reports() {
  const [active, setActive] = useState<'payroll' | 'attendance'>('payroll')

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              active === t.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {active === 'payroll' && <PayrollSummaryTab />}
      {active === 'attendance' && <AttendanceTab />}
    </div>
  )
}
