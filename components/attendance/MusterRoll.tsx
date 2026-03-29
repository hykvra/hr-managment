'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

type MusterRow = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  days: Record<number, string>
  present: number
  half: number
  double: number
  leave: number
  absent: number
}

const STATUS_ABBR: Record<string, { abbr: string; tw: string; printCls: string }> = {
  Present:       { abbr: 'P', tw: 'bg-green-600 text-white',      printCls: 'font-bold' },
  HalfDay:       { abbr: 'H', tw: 'bg-yellow-500 text-black',     printCls: 'font-bold' },
  DoubleShift:   { abbr: 'D', tw: 'bg-blue-600 text-white',       printCls: 'font-bold' },
  Absent:        { abbr: 'A', tw: 'bg-zinc-600 text-white',       printCls: '' },
  Uninformed:    { abbr: 'U', tw: 'bg-red-600 text-white',        printCls: 'font-bold' },
  ApprovedLeave: { abbr: 'L', tw: 'bg-purple-600 text-white',     printCls: '' },
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export function MusterRoll() {
  const now  = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows,  setRows]  = useState<MusterRow[]>([])
  const [daysInMonth, setDaysInMonth] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  async function loadMuster() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/muster-roll?year=${year}&month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows || [])
        setDaysInMonth(data.daysInMonth)
        setCompanyName(data.companyName || '')
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={month}
          onChange={e => { setMonth(Number(e.target.value)); setLoaded(false) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={e => { setYear(Number(e.target.value)); setLoaded(false) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <Button
          size="sm"
          className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={loadMuster}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Load Muster Roll'}
        </Button>
        {loaded && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-zinc-700 text-zinc-300 gap-1 ml-auto print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
        )}
      </div>

      {!loaded && !loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
          Select month &amp; year, then click Load Muster Roll
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      )}

      {loaded && (
        <div id="muster-print-area">
          {/* Print-only header */}
          <div className="hidden print:block text-center mb-3">
            <h1 className="text-xl font-bold">{companyName}</h1>
            <h2 className="text-base">Muster Roll — {MONTHS[month - 1]} {year}</h2>
          </div>

          <p className="text-zinc-500 text-xs mb-2 print:hidden">
            {companyName} · {MONTHS[month - 1]} {year} · {rows.length} employee{rows.length !== 1 ? 's' : ''}
          </p>

          <div className="overflow-x-auto rounded-lg border border-zinc-800 print:border-black print:rounded-none">
            <table className="text-[10px] border-collapse w-full print:text-[8px]">
              <thead>
                <tr className="bg-zinc-800/60 print:bg-gray-100">
                  <th className="sticky left-0 z-10 bg-zinc-800 print:bg-gray-100 px-2 py-2 text-left font-medium text-zinc-400 print:text-black border-r border-zinc-700 print:border-gray-400 whitespace-nowrap min-w-[150px]">
                    Employee
                  </th>
                  {days.map(d => (
                    <th key={d} className="px-0.5 py-2 font-medium text-zinc-400 print:text-black border-r border-zinc-700 print:border-gray-300 text-center min-w-[20px]">
                      {d}
                    </th>
                  ))}
                  <th className="px-1.5 py-2 font-medium text-green-400 print:text-black text-center border-l-2 border-zinc-600 print:border-gray-400 whitespace-nowrap">P</th>
                  <th className="px-1.5 py-2 font-medium text-yellow-400 print:text-black text-center whitespace-nowrap">H</th>
                  <th className="px-1.5 py-2 font-medium text-blue-400 print:text-black text-center whitespace-nowrap">D</th>
                  <th className="px-1.5 py-2 font-medium text-purple-400 print:text-black text-center whitespace-nowrap">L</th>
                  <th className="px-1.5 py-2 font-medium text-red-400 print:text-black text-center whitespace-nowrap">Ab</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-t border-zinc-800 print:border-gray-200 ${
                      idx % 2 === 1 ? 'bg-zinc-900/40 print:bg-gray-50' : ''
                    }`}
                  >
                    <td className="sticky left-0 bg-zinc-900 print:bg-white border-r border-zinc-700 print:border-gray-400 px-2 py-1.5 whitespace-nowrap">
                      <span className="text-zinc-200 print:text-black font-medium">
                        {row.first_name} {row.last_name}
                      </span>
                      {row.employee_code && (
                        <span className="text-zinc-600 print:text-gray-400 ml-1 font-mono">
                          #{row.employee_code}
                        </span>
                      )}
                    </td>
                    {days.map(d => {
                      const s    = row.days[d]
                      const info = s ? STATUS_ABBR[s] : null
                      return (
                        <td key={d} className="px-0 py-1.5 text-center border-r border-zinc-800 print:border-gray-200">
                          {info ? (
                            <span
                              className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-sm text-[8px] font-bold print:bg-transparent print:text-black ${info.tw} ${info.printCls}`}
                            >
                              {info.abbr}
                            </span>
                          ) : (
                            <span className="text-zinc-800 print:text-gray-200">·</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-1.5 py-1.5 text-center text-green-400 print:text-black font-semibold border-l-2 border-zinc-600 print:border-gray-400">
                      {row.present || 0}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-yellow-400 print:text-black">
                      {row.half || 0}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-blue-400 print:text-black">
                      {row.double || 0}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-purple-400 print:text-black">
                      {row.leave || 0}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-red-400 print:text-black">
                      {row.absent || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Print legend */}
          <div className="hidden print:flex gap-4 mt-3 text-[8px] text-gray-600">
            <span>P = Present</span>
            <span>H = Half Day</span>
            <span>D = Double Shift</span>
            <span>L = Approved Leave</span>
            <span>Ab = Absent / Uninformed</span>
          </div>
        </div>
      )}
    </div>
  )
}
