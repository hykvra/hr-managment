'use client'

import { useState } from 'react'
import { CalendarDays, Wallet, MessageSquare, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeaveRequestModal } from './LeaveRequestModal'
import { SalaryAdvanceModal } from './SalaryAdvanceModal'
import { SupportTicketModal } from './SupportTicketModal'
import { ResignationModal } from './ResignationModal'
import { SettingsModal } from './SettingsModal'

interface EmployeeSettings {
  email: string
  mobile: string
  address: string
  emergency_name: string | null
  emergency_phone: string | null
  bank_name: string | null
  account_no: string | null
  ifsc: string | null
  branch_name: string | null
  account_holder: string | null
}

interface Props {
  employee: EmployeeSettings
  baseSalary: number
  leaveBalance: number
  hasPendingAdvance: boolean
  resignationStatus: boolean
  resignationDate: string | null
  lastWorkingDate: string | null
}

type ModalType = 'leave' | 'advance' | 'ticket' | 'resignation' | 'settings' | null

export function DashboardActions({
  employee, baseSalary, leaveBalance, hasPendingAdvance,
  resignationStatus, resignationDate, lastWorkingDate,
}: Props) {
  const [open, setOpen] = useState<ModalType>(null)

  return (
    <>
      {/* Header right-side controls */}
      <div className="flex items-center gap-2">
        {/* Action buttons — visible on sm+ */}
        <div className="hidden sm:flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
            onClick={() => setOpen('leave')}
          >
            <CalendarDays className="w-3 h-3" /> Leave
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
            onClick={() => setOpen('advance')}
          >
            <Wallet className="w-3 h-3" /> Advance
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
            onClick={() => setOpen('ticket')}
          >
            <MessageSquare className="w-3 h-3" /> Ticket
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
          onClick={() => setOpen('settings')}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Mobile action buttons — below header */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 flex gap-2 z-20">
        <Button size="sm" variant="outline" className="flex-1 text-xs border-zinc-700 gap-1" onClick={() => setOpen('leave')}>
          <CalendarDays className="w-3 h-3" /> Leave
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs border-zinc-700 gap-1" onClick={() => setOpen('advance')}>
          <Wallet className="w-3 h-3" /> Advance
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs border-zinc-700 gap-1" onClick={() => setOpen('ticket')}>
          <MessageSquare className="w-3 h-3" /> Ticket
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`flex-1 text-xs border-zinc-700 gap-1 ${resignationStatus ? 'border-red-500/30 text-red-400' : ''}`}
          onClick={() => setOpen('resignation')}
        >
          <LogOut className="w-3 h-3" /> Resign
        </Button>
      </div>

      {/* Resignation button — desktop (in header area) */}
      <div className="hidden sm:block">
        <Button
          size="sm"
          variant="ghost"
          className={`h-7 px-2 text-xs gap-1 ${resignationStatus ? 'text-red-400 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          onClick={() => setOpen('resignation')}
          title="Resignation"
        >
          <LogOut className="w-3 h-3" />
        </Button>
      </div>

      {/* Modals */}
      <LeaveRequestModal
        leaveBalance={leaveBalance}
        open={open === 'leave'}
        onClose={() => setOpen(null)}
      />
      <SalaryAdvanceModal
        baseSalary={baseSalary}
        hasPendingAdvance={hasPendingAdvance}
        open={open === 'advance'}
        onClose={() => setOpen(null)}
      />
      <SupportTicketModal
        open={open === 'ticket'}
        onClose={() => setOpen(null)}
      />
      <ResignationModal
        resignationStatus={resignationStatus}
        resignationDate={resignationDate}
        lastWorkingDate={lastWorkingDate}
        open={open === 'resignation'}
        onClose={() => setOpen(null)}
      />
      <SettingsModal
        employee={employee}
        open={open === 'settings'}
        onClose={() => setOpen(null)}
      />
    </>
  )
}
