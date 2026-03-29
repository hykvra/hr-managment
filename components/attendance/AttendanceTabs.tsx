'use client'

import { useState } from 'react'
import { CalendarDays, BarChart2, Grid3x3, Clock, RefreshCw } from 'lucide-react'
import { DailySheet } from './DailySheet'
import { MonthlyReport } from './MonthlyReport'
import { MusterRoll } from './MusterRoll'
import { PunchReport } from './PunchReport'
import { RegularizationManagement } from './RegularizationManagement'

type Employee = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  shift_id: string | null
}

type Shift = { id: string; name: string }

interface Props {
  employees: Employee[]
  shifts: Shift[]
  todayDate: string
  todayAttendance: Record<string, string>
  todayApprovedLeaveIds: string[]
}

const TABS = [
  { id: 'daily',        label: 'Daily Sheet',    Icon: CalendarDays },
  { id: 'monthly',      label: 'Monthly Report', Icon: BarChart2    },
  { id: 'muster',       label: 'Muster Roll',    Icon: Grid3x3      },
  { id: 'punch',        label: 'Punch Report',   Icon: Clock        },
  { id: 'regularize',   label: 'Regularizations',Icon: RefreshCw   },
] as const

type TabId = (typeof TABS)[number]['id']

export function AttendanceTabs({
  employees,
  shifts,
  todayDate,
  todayAttendance,
  todayApprovedLeaveIds,
}: Props) {
  const [active, setActive] = useState<TabId>('daily')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-zinc-800">
        {TABS.map(t => {
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
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {active === 'daily' && (
          <DailySheet
            employees={employees}
            shifts={shifts}
            initialDate={todayDate}
            initialAttendance={todayAttendance}
            initialApprovedLeaveIds={todayApprovedLeaveIds}
          />
        )}
        {active === 'monthly' && (
          <MonthlyReport employees={employees} />
        )}
        {active === 'muster' && (
          <MusterRoll />
        )}
        {active === 'punch' && (
          <PunchReport />
        )}
        {active === 'regularize' && (
          <RegularizationManagement />
        )}
      </div>
    </div>
  )
}
