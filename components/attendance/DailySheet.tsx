'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Save, CheckSquare } from 'lucide-react'
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
  shift_id: string | null
}

type Shift = { id: string; name: string }

type StatusCode = 'Present' | 'HalfDay' | 'DoubleShift' | 'Absent' | 'Uninformed' | 'ApprovedLeave'

const STATUS_BUTTONS: { code: StatusCode; label: string; short: string; cls: string }[] = [
  { code: 'Present',       label: 'Present',       short: 'P',  cls: 'bg-green-600 hover:bg-green-700 text-white' },
  { code: 'HalfDay',       label: 'Half Day',       short: 'H',  cls: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
  { code: 'DoubleShift',   label: 'Double Shift',   short: 'D',  cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { code: 'Absent',        label: 'Absent',         short: 'A',  cls: 'bg-zinc-600 hover:bg-zinc-700 text-white' },
  { code: 'Uninformed',    label: 'Uninformed',     short: 'U',  cls: 'bg-red-600 hover:bg-red-700 text-white' },
  { code: 'ApprovedLeave', label: 'Approved Leave', short: 'L',  cls: 'bg-purple-600 hover:bg-purple-700 text-white' },
]

const STATUS_DISPLAY: Record<StatusCode, { label: string; cls: string }> = {
  Present:       { label: 'P',  cls: 'bg-green-600 text-white' },
  HalfDay:       { label: 'H',  cls: 'bg-yellow-500 text-black' },
  DoubleShift:   { label: 'D',  cls: 'bg-blue-600 text-white' },
  Absent:        { label: 'A',  cls: 'bg-zinc-600 text-white' },
  Uninformed:    { label: 'U',  cls: 'bg-red-600 text-white' },
  ApprovedLeave: { label: 'L',  cls: 'bg-purple-600 text-white' },
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  employees: Employee[]
  shifts: Shift[]
  initialDate?: string
  initialAttendance?: Record<string, string>
  initialApprovedLeaveIds?: string[]
}

export function DailySheet({
  employees,
  shifts,
  initialDate,
  initialAttendance = {},
  initialApprovedLeaveIds = [],
}: Props) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate || todayStr())
  const [shiftFilter, setShiftFilter] = useState<string>('all')
  const [records, setRecords] = useState<Record<string, StatusCode>>(() => {
    const r: Record<string, StatusCode> = {}
    for (const [k, v] of Object.entries(initialAttendance)) {
      r[k] = v as StatusCode
    }
    return r
  })
  const [approvedLeaveIds, setApprovedLeaveIds] = useState<Set<string>>(
    new Set(initialApprovedLeaveIds)
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)

  const filteredEmployees = useMemo(() => {
    if (shiftFilter === 'all') return employees
    return employees.filter(e => e.shift_id === shiftFilter)
  }, [employees, shiftFilter])

  async function loadDate(d: string) {
    setLoadingDate(true)
    try {
      const res = await fetch(`/api/admin/attendance/daily?date=${d}`)
      if (res.ok) {
        const { attendance, approvedLeaveIds: ids } = await res.json() as {
          attendance: Record<string, string>
          approvedLeaveIds: string[]
        }
        const r: Record<string, StatusCode> = {}
        for (const [k, v] of Object.entries(attendance)) {
          r[k] = v as StatusCode
        }
        setRecords(r)
        setApprovedLeaveIds(new Set(ids))
      }
    } finally {
      setLoadingDate(false)
    }
  }

  function handleDateChange(d: string) {
    setDate(d)
    setRecords({})
    loadDate(d)
  }

  function setStatus(empId: string, status: StatusCode) {
    setRecords(r => ({ ...r, [empId]: status }))
  }

  function markAllPresent() {
    const updated: Record<string, StatusCode> = { ...records }
    for (const emp of filteredEmployees) {
      if (approvedLeaveIds.has(emp.id)) {
        updated[emp.id] = 'ApprovedLeave'
      } else if (!updated[emp.id]) {
        updated[emp.id] = 'Present'
      }
    }
    setRecords(updated)
  }

  async function saveAll() {
    setSaving(true)
    setSaved(false)
    try {
      const recs = filteredEmployees
        .filter(e => records[e.id])
        .map(e => ({ employee_id: e.id, status: records[e.id] }))

      if (recs.length === 0) return

      const res = await fetch('/api/admin/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records: recs }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const markedCount = filteredEmployees.filter(e => records[e.id]).length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs whitespace-nowrap">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => handleDateChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs whitespace-nowrap">Shift</label>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="h-8 w-36 text-xs bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="All shifts" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all" className="text-xs">All Shifts</SelectItem>
              {shifts.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-zinc-700 text-zinc-300 gap-1"
            onClick={markAllPresent}
            disabled={loadingDate}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Mark All Present
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
            onClick={saveAll}
            disabled={saving || loadingDate || markedCount === 0}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : saved ? 'Saved ✓' : `Save (${markedCount})`}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {STATUS_BUTTONS.map(s => (
          <span key={s.code} className={`text-[10px] px-2 py-0.5 rounded font-medium ${s.cls}`}>
            {s.short} — {s.label}
          </span>
        ))}
        <span className="text-[10px] text-zinc-500 px-2 py-0.5 italic">
          * Uninformed = 2× salary penalty
        </span>
      </div>

      {/* Employee rows */}
      {loadingDate ? (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No employees in this shift</div>
      ) : (
        <div className="space-y-1.5">
          {filteredEmployees.map(emp => {
            const current = records[emp.id] as StatusCode | undefined
            const isOnLeave = approvedLeaveIds.has(emp.id)
            const shift = shifts.find(s => s.id === emp.shift_id)
            return (
              <div
                key={emp.id}
                className="bg-zinc-800 rounded-lg px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2"
              >
                {/* Employee info */}
                <div className="flex items-center gap-2 min-w-0 sm:w-52 shrink-0">
                  {current && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_DISPLAY[current].cls}`}>
                      {STATUS_DISPLAY[current].label}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-xs font-medium truncate">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {emp.employee_code && (
                        <span className="text-zinc-500 text-[10px] font-mono shrink-0">#{emp.employee_code}</span>
                      )}
                    </div>
                    {shift && <span className="text-zinc-500 text-[10px]">{shift.name}</span>}
                    {isOnLeave && !current && (
                      <span className="text-purple-400 text-[10px]">Approved Leave today</span>
                    )}
                  </div>
                </div>

                {/* Status buttons */}
                <div className="flex flex-wrap gap-1">
                  {STATUS_BUTTONS.map(s => (
                    <button
                      key={s.code}
                      onClick={() => setStatus(emp.id, s.code)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all border ${
                        current === s.code
                          ? `${s.cls} border-transparent scale-105 shadow`
                          : 'bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>

                {/* Uninformed warning */}
                {current === 'Uninformed' && (
                  <span className="text-red-400 text-[10px] italic ml-auto shrink-0">
                    2× penalty applies
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
