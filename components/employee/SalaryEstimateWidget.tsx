'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Info } from 'lucide-react'
import type { AttendanceRecord, BonusHistoryRecord, SalaryAdvance } from '@/types'

interface Props {
  baseSalary: number
  leaveBalance: number
  attendance: Pick<AttendanceRecord, 'date' | 'status'>[]
  bonusHistory: BonusHistoryRecord[]
  advances: SalaryAdvance[]
  penalties: number
  currentMonth: number
  currentYear: number
}

export function SalaryEstimateWidget({
  baseSalary, leaveBalance, attendance, bonusHistory, advances, penalties, currentMonth, currentYear,
}: Props) {
  const dailyRate = baseSalary / 30

  const present      = attendance.filter(a => a.status === 'Present').length
  const halfDay      = attendance.filter(a => a.status === 'HalfDay').length
  const doubleShift  = attendance.filter(a => a.status === 'DoubleShift').length
  const uninformed   = attendance.filter(a => a.status === 'Uninformed').length

  const daysPresent = present + halfDay * 0.5 + doubleShift * 2

  let payableDays: number
  if (daysPresent < 15) {
    payableDays = daysPresent
  } else if (daysPresent <= 26) {
    payableDays = daysPresent + leaveBalance / 2
  } else {
    payableDays = daysPresent + leaveBalance
  }

  // uninformed absences are penalised (2× daily rate deducted)
  // they count as absent already; we subtract the extra penalty equivalent here
  const penaltyDays = uninformed // 1× already lost; penalty adds another 1×
  payableDays = Math.min(payableDays, 30) - penaltyDays

  // Bonuses this month
  const bonusThisMonth = bonusHistory
    .filter(b => {
      const d = new Date(b.bonus_month)
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
    })
    .reduce((sum, b) => sum + Number(b.amount), 0)

  // Approved advances (deduct from pay)
  const approvedAdvances = advances
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + Number(a.approved_amount || 0), 0)

  const gross = Math.max(0, payableDays) * dailyRate + bonusThisMonth - approvedAdvances - penalties
  const netPayable = Math.max(0, gross)

  const rows: { label: string; value: string; color?: string }[] = [
    { label: 'Daily Rate', value: `₹${dailyRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Days Present', value: `${daysPresent.toFixed(1)}` },
    { label: 'Payable Days', value: `${Math.min(payableDays, 30).toFixed(1)}` },
    { label: 'Gross Pay', value: `₹${(Math.max(0, payableDays) * dailyRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
  ]

  if (bonusThisMonth > 0) {
    rows.push({ label: 'Bonus', value: `+₹${bonusThisMonth.toLocaleString('en-IN')}`, color: 'text-green-400' })
  }
  if (approvedAdvances > 0) {
    rows.push({ label: 'Advance Deduction', value: `-₹${approvedAdvances.toLocaleString('en-IN')}`, color: 'text-red-400' })
  }
  if (penalties > 0) {
    rows.push({ label: 'Penalties', value: `-₹${penalties.toLocaleString('en-IN')}`, color: 'text-red-400' })
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Salary Estimate
          </CardTitle>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
            <div className="absolute right-0 top-5 w-56 bg-zinc-800 border border-zinc-700 rounded-md p-2 text-[10px] text-zinc-400 hidden group-hover:block z-10 shadow-lg">
              Estimate based on attendance this month. Final salary is set by admin.
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">{row.label}</span>
              <span className={`font-medium ${row.color || 'text-zinc-300'}`}>{row.value}</span>
            </div>
          ))}
          <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between items-center">
            <span className="text-zinc-400 text-xs font-medium">Estimated Net</span>
            <span className="text-white font-bold text-lg">
              ₹{netPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-zinc-800 rounded-md p-2">
            <p className="text-white font-semibold text-sm">{present}</p>
            <p className="text-zinc-500 text-[10px]">Present</p>
          </div>
          <div className="bg-zinc-800 rounded-md p-2">
            <p className="text-white font-semibold text-sm">{halfDay}</p>
            <p className="text-zinc-500 text-[10px]">Half Day</p>
          </div>
          <div className="bg-zinc-800 rounded-md p-2">
            <p className="text-white font-semibold text-sm">{doubleShift}</p>
            <p className="text-zinc-500 text-[10px]">Double</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
