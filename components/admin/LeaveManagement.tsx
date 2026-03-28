'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LeaveWithEmployee = {
  id: string
  leave_date: string
  end_date: string | null
  leave_type: string
  exception_flag: boolean
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}

interface Props {
  pendingLeaves: LeaveWithEmployee[]
}

const TYPE_STYLE: Record<string, string> = {
  Sick:     'bg-red-500/10 text-red-400',
  Casual:   'bg-blue-500/10 text-blue-400',
  Earned:   'bg-green-500/10 text-green-400',
  Vacation: 'bg-purple-500/10 text-purple-400',
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export function LeaveManagement({ pendingLeaves }: Props) {
  const router = useRouter()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function action(id: string, act: 'approve' | 'reject', comment?: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act, comment }),
      })
      if (res.ok) { setRejectingId(null); router.refresh() }
    } finally {
      setLoadingId(null)
    }
  }

  if (pendingLeaves.length === 0) {
    return <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No pending leave requests</div>
  }

  return (
    <div className="space-y-2">
      {pendingLeaves.map(lr => {
        const emp = lr.employees
        return (
          <div key={lr.id} className="bg-zinc-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</span>
                {emp.employee_code && <span className="text-zinc-500 text-xs font-mono">#{emp.employee_code}</span>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[lr.leave_type] || 'bg-zinc-700 text-zinc-300'}`}>
                  {lr.leave_type}
                </span>
                {lr.exception_flag && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">Exception</span>
                )}
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                {fmt(lr.leave_date)}{lr.end_date ? ` → ${fmt(lr.end_date)}` : ''}
                <span className="text-zinc-600 ml-2">applied {fmt(lr.created_at)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {rejectingId === lr.id ? (
                <>
                  <Input
                    placeholder="Reason (optional)"
                    value={comments[lr.id] || ''}
                    onChange={e => setComments(c => ({ ...c, [lr.id]: e.target.value }))}
                    className="h-7 text-xs bg-zinc-700 border-zinc-600 text-white w-36 placeholder:text-zinc-500"
                  />
                  <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 shrink-0"
                    disabled={loadingId === lr.id}
                    onClick={() => action(lr.id, 'reject', comments[lr.id])}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    disabled={loadingId === lr.id}
                    onClick={() => setRejectingId(lr.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    disabled={loadingId === lr.id}
                    onClick={() => action(lr.id, 'approve')}>
                    <Check className="w-3 h-3" /> Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
