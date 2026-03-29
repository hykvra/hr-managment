'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PunchRow = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  status: string | null
  clock_in_time: string | null
  clock_out_time: string | null
}

function fmtTime(t: string | null): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function calcHours(inTime: string | null, outTime: string | null): string {
  if (!inTime || !outTime) return '—'
  const [ih, im] = inTime.split(':').map(Number)
  const [oh, om] = outTime.split(':').map(Number)
  const mins = oh * 60 + om - (ih * 60 + im)
  if (mins < 0) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_CLS: Record<string, string> = {
  Present:       'bg-green-600/20 text-green-400',
  DoubleShift:   'bg-blue-600/20 text-blue-400',
  HalfDay:       'bg-yellow-600/20 text-yellow-400',
  Absent:        'bg-red-600/20 text-red-400',
  Uninformed:    'bg-red-600/20 text-red-400',
  ApprovedLeave: 'bg-purple-600/20 text-purple-400',
}

export function PunchReport() {
  const [date, setDate]   = useState(todayStr())
  const [rows, setRows]   = useState<PunchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)

  async function loadReport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/punch?date=${date}`)
      if (res.ok) {
        const { rows: r } = await res.json()
        setRows(r || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Employee', 'Code', 'Status', 'Clock In', 'Clock Out', 'Hours']
    const csvRows = rows.map(r => [
      `${r.first_name} ${r.last_name}`,
      r.employee_code || '',
      r.status || 'Not Marked',
      fmtTime(r.clock_in_time),
      fmtTime(r.clock_out_time),
      calcHours(r.clock_in_time, r.clock_out_time),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv  = [header.join(','), ...csvRows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `punch-report-${date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const clockedIn  = rows.filter(r => r.clock_in_time).length
  const shiftDone  = rows.filter(r => r.clock_out_time).length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 text-xs whitespace-nowrap">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setLoaded(false) }}
            className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={loadReport} disabled={loading}>
          {loading ? 'Loading…' : 'Load Report'}
        </Button>
        {loaded && rows.length > 0 && (
          <Button size="sm" variant="outline"
            className="h-8 text-xs border-zinc-700 text-zinc-300 gap-1 ml-auto"
            onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        )}
      </div>

      {!loaded && !loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
          Select a date and click Load Report
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      )}

      {loaded && (
        <>
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            <span>Total: <strong className="text-white">{rows.length}</strong></span>
            <span>Clocked In: <strong className="text-green-400">{clockedIn}</strong></span>
            <span>Shift Complete: <strong className="text-blue-400">{shiftDone}</strong></span>
            <span>Not Punched: <strong className="text-zinc-500">{rows.length - clockedIn}</strong></span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-800/60 text-zinc-400 text-left">
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Clock In</th>
                  <th className="px-3 py-2 font-medium">Clock Out</th>
                  <th className="px-3 py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-white whitespace-nowrap">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 font-mono">
                      {r.employee_code || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.status ? (STATUS_CLS[r.status] || 'bg-zinc-700 text-zinc-400') : 'bg-zinc-700 text-zinc-500'
                      }`}>
                        {r.status || 'Not Marked'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {fmtTime(r.clock_in_time)}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {fmtTime(r.clock_out_time)}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {calcHours(r.clock_in_time, r.clock_out_time)}
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
