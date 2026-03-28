'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Employee = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
}

type AttendanceRecord = { date: string; status: string }

type EmployeeDetail = {
  first_name: string
  last_name: string
  employee_code: string | null
  base_salary: number
  leave_balance: number
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  Present:       { label: 'P',  cls: 'bg-green-600 text-white' },
  HalfDay:       { label: 'H',  cls: 'bg-yellow-500 text-black' },
  DoubleShift:   { label: 'D',  cls: 'bg-blue-600 text-white' },
  Absent:        { label: 'A',  cls: 'bg-zinc-600 text-white' },
  Uninformed:    { label: 'U',  cls: 'bg-red-600 text-white' },
  ApprovedLeave: { label: 'L',  cls: 'bg-purple-600 text-white' },
}

function computeSalary(records: AttendanceRecord[], baseSalary: number) {
  const daily = baseSalary / 30
  let present = 0, halfDay = 0, double = 0, absent = 0, uninformed = 0, leave = 0

  for (const r of records) {
    switch (r.status) {
      case 'Present':       present++;       break
      case 'HalfDay':       halfDay++;       break
      case 'DoubleShift':   double++;        break
      case 'Absent':        absent++;        break
      case 'Uninformed':    uninformed++;    break
      case 'ApprovedLeave': leave++;         break
    }
  }

  const effectiveDays = present + double * 2 + halfDay * 0.5 + leave
  let payableDays: number
  if (effectiveDays >= 26) payableDays = 30
  else if (effectiveDays >= 24) payableDays = 28
  else if (effectiveDays >= 22) payableDays = 26
  else payableDays = effectiveDays

  const uninformedPenalty = uninformed * daily * 2
  const grossSalary = payableDays * daily
  const netSalary = Math.max(0, grossSalary - uninformedPenalty)

  return { present, halfDay, double, absent, uninformed, leave, payableDays, grossSalary, netSalary, uninformedPenalty }
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface Props {
  employees: Employee[]
}

export function MonthlyReport({ employees }: Props) {
  const now = new Date()
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function load(empId: string, y: number, m: number) {
    if (!empId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/attendance/monthly?employee_id=${empId}&year=${y}&month=${m}`)
      if (res.ok) {
        const data = await res.json() as { attendance: AttendanceRecord[]; employee: EmployeeDetail }
        setAttendance(data.attendance || [])
        setEmployee(data.employee)
        setLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }

  function changeMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }
    setMonth(newMonth)
    setYear(newYear)
    load(selectedEmpId, newYear, newMonth)
  }

  function handleEmpChange(id: string) {
    setSelectedEmpId(id)
    setLoaded(false)
    setAttendance([])
    setEmployee(null)
  }

  const attendanceMap: Record<string, string> = {}
  for (const r of attendance) {
    attendanceMap[r.date] = r.status
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun

  const stats = employee ? computeSalary(attendance, employee.base_salary) : null

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEmpId} onValueChange={handleEmpChange}>
          <SelectTrigger className="h-8 w-52 text-xs bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-60">
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {e.first_name} {e.last_name}
                {e.employee_code ? ` (#${e.employee_code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white text-xs font-medium w-32 text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={() => changeMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
          disabled={!selectedEmpId || loading}
          onClick={() => load(selectedEmpId, year, month)}
        >
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_STYLE).map(([code, { label, cls }]) => (
          <span key={code} className={`text-[10px] px-2 py-0.5 rounded font-medium ${cls}`}>
            {label} — {code}
          </span>
        ))}
      </div>

      {!loaded && !loading && (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
          Select an employee and click Load Report
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading…</div>
      )}

      {loaded && !loading && employee && (
        <>
          {/* Employee header */}
          <div className="bg-zinc-800/50 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-white font-semibold text-sm">
                {employee.first_name} {employee.last_name}
                {employee.employee_code && (
                  <span className="text-zinc-500 text-xs font-mono ml-2">#{employee.employee_code}</span>
                )}
              </p>
              <p className="text-zinc-400 text-xs">
                Base Salary: ₹{Number(employee.base_salary).toLocaleString('en-IN')} · Leave Balance: {employee.leave_balance} days
              </p>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[280px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] text-zinc-500 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Leading empty cells */}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const status = attendanceMap[dateStr]
                  const style = status ? STATUS_STYLE[status] : null
                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded flex flex-col items-center justify-center text-[10px] font-medium ${
                        style ? style.cls : 'bg-zinc-800/60 text-zinc-600'
                      }`}
                      title={status || 'Not recorded'}
                    >
                      <span>{day}</span>
                      {style && <span className="text-[8px] leading-none">{style.label}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatBox label="Present" value={stats.present} cls="text-green-400" />
              <StatBox label="Half Day" value={stats.halfDay} cls="text-yellow-400" />
              <StatBox label="Double Shift" value={stats.double} cls="text-blue-400" />
              <StatBox label="Absent" value={stats.absent} cls="text-zinc-400" />
              <StatBox label="Uninformed" value={stats.uninformed} cls="text-red-400" />
              <StatBox label="Approved Leave" value={stats.leave} cls="text-purple-400" />
            </div>
          )}

          {/* Salary estimate */}
          {stats && (
            <div className="bg-zinc-800/50 rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Salary Estimate</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-zinc-500 text-[10px]">Payable Days</p>
                  <p className="text-white font-semibold text-sm">{stats.payableDays}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[10px]">Gross Salary</p>
                  <p className="text-white font-semibold text-sm">₹{Math.round(stats.grossSalary).toLocaleString('en-IN')}</p>
                </div>
                {stats.uninformedPenalty > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px]">Uninformed Penalty</p>
                    <p className="text-red-400 font-semibold text-sm">−₹{Math.round(stats.uninformedPenalty).toLocaleString('en-IN')}</p>
                  </div>
                )}
                <div>
                  <p className="text-zinc-500 text-[10px]">Net Salary</p>
                  <p className="text-green-400 font-bold text-base">₹{Math.round(stats.netSalary).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatBox({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg px-3 py-2">
      <p className="text-zinc-500 text-[10px]">{label}</p>
      <p className={`font-bold text-xl ${value > 0 ? cls : 'text-zinc-600'}`}>{value}</p>
    </div>
  )
}
