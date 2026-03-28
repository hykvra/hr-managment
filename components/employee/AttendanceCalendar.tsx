'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AttendanceRecord, LeaveRequest } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  Present:      'bg-green-500/20 text-green-400 border border-green-500/30',
  HalfDay:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  DoubleShift:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Absent:       'bg-red-500/20 text-red-400 border border-red-500/30',
  Uninformed:   'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  ApprovedLeave:'bg-teal-500/20 text-teal-400 border border-teal-500/30',
}

const STATUS_SHORT: Record<string, string> = {
  Present: 'P', HalfDay: 'H', DoubleShift: 'D',
  Absent: 'A', Uninformed: 'U', ApprovedLeave: 'L',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEK_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

interface Props {
  initialAttendance: Pick<AttendanceRecord, 'date' | 'status'>[]
  leaveRequests: LeaveRequest[]
  initialYear: number
  initialMonth: number
}

export function AttendanceCalendar({ initialAttendance, leaveRequests, initialYear, initialMonth }: Props) {
  const today = new Date()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [loading, setLoading] = useState(false)

  const isCurrentMonth = year === today.getFullYear() && month === (today.getMonth() + 1)
  const isInitialMonth = year === initialYear && month === initialMonth

  async function loadMonth(y: number, m: number) {
    if (y === initialYear && m === initialMonth) {
      setAttendance(initialAttendance)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/attendance?year=${y}&month=${m}`)
      const data = await res.json()
      setAttendance(data.attendance || [])
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    const d = new Date(year, month - 2, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    loadMonth(d.getFullYear(), d.getMonth() + 1)
  }

  function nextMonth() {
    const next = new Date(year, month, 1)
    if (next > today) return
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
    loadMonth(next.getFullYear(), next.getMonth() + 1)
  }

  const attendanceMap: Record<string, string> = {}
  attendance.forEach(r => { attendanceMap[r.date] = r.status })

  const leaveMap: Record<string, string> = {}
  leaveRequests.forEach(lr => {
    const d = new Date(lr.leave_date)
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      if (lr.status === 'pending' || lr.status === 'approved') {
        leaveMap[lr.leave_date] = lr.status
      }
    }
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()
  const todayStr = today.toISOString().split('T')[0]

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function cellStyle(day: number): string {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = ds === todayStr
    const todayRing = isToday ? ' ring-2 ring-white/40' : ''

    if (attendanceMap[ds]) return (STATUS_STYLES[attendanceMap[ds]] || 'bg-zinc-700 text-zinc-300') + todayRing
    if (leaveMap[ds] === 'pending') return `bg-purple-500/20 text-purple-400 border border-purple-500/30${todayRing}`
    if (isToday) return 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
    if (ds < todayStr) return 'bg-zinc-800/70 text-zinc-500'
    return 'bg-zinc-900 text-zinc-700'
  }

  function cellLabel(day: number): string {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (attendanceMap[ds]) return STATUS_SHORT[attendanceMap[ds]] || ''
    if (leaveMap[ds] === 'pending') return 'PL'
    return ''
  }

  const presentCount   = attendance.filter(a => a.status === 'Present').length
  const halfCount      = attendance.filter(a => a.status === 'HalfDay').length
  const doubleCount    = attendance.filter(a => a.status === 'DoubleShift').length
  const absentCount    = attendance.filter(a => a.status === 'Absent' || a.status === 'Uninformed').length
  const leaveCount     = attendance.filter(a => a.status === 'ApprovedLeave').length

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">Attendance</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-zinc-300 w-16 text-center font-medium">
              {MONTHS[month - 1]} {year}
            </span>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-white disabled:opacity-30"
              onClick={nextMonth} disabled={isCurrentMonth}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-500 text-xs">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] text-zinc-600 py-0.5 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => (
                <div key={i} className="aspect-square">
                  {day !== null && (
                    <div className={`w-full h-full rounded flex flex-col items-center justify-center text-[10px] font-medium ${cellStyle(day)}`}>
                      <span>{day}</span>
                      {cellLabel(day) && (
                        <span className="text-[8px] leading-none opacity-75">{cellLabel(day)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {[
                { label: 'Present',    style: 'bg-green-500/20 text-green-400',   abbr: 'P' },
                { label: 'Half Day',   style: 'bg-yellow-500/20 text-yellow-400', abbr: 'H' },
                { label: 'Double',     style: 'bg-blue-500/20 text-blue-400',     abbr: 'D' },
                { label: 'Absent',     style: 'bg-red-500/20 text-red-400',       abbr: 'A' },
                { label: 'Uninformed', style: 'bg-orange-500/20 text-orange-400', abbr: 'U' },
                { label: 'Leave',      style: 'bg-teal-500/20 text-teal-400',     abbr: 'L' },
                { label: 'Pending',    style: 'bg-purple-500/20 text-purple-400', abbr: 'PL' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold ${item.style}`}>
                    {item.abbr}
                  </div>
                  <span className="text-[10px] text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Monthly summary */}
            <div className="mt-3 grid grid-cols-5 gap-1 text-center">
              <div className="bg-green-500/10 rounded-md p-1.5">
                <p className="text-green-400 font-bold text-sm">{presentCount}</p>
                <p className="text-zinc-500 text-[10px]">Present</p>
              </div>
              <div className="bg-yellow-500/10 rounded-md p-1.5">
                <p className="text-yellow-400 font-bold text-sm">{halfCount}</p>
                <p className="text-zinc-500 text-[10px]">Half</p>
              </div>
              <div className="bg-blue-500/10 rounded-md p-1.5">
                <p className="text-blue-400 font-bold text-sm">{doubleCount}</p>
                <p className="text-zinc-500 text-[10px]">Double</p>
              </div>
              <div className="bg-red-500/10 rounded-md p-1.5">
                <p className="text-red-400 font-bold text-sm">{absentCount}</p>
                <p className="text-zinc-500 text-[10px]">Absent</p>
              </div>
              <div className="bg-teal-500/10 rounded-md p-1.5">
                <p className="text-teal-400 font-bold text-sm">{leaveCount}</p>
                <p className="text-zinc-500 text-[10px]">Leave</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
