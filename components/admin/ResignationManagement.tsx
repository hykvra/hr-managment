'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, UserX, UserCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Resignation = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  email: string
  mobile: string
  department: string | null
  is_active: boolean
  resignation_date: string | null
  last_working_date: string | null
  shifts: { name: string } | null
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ResignationManagement() {
  const [resignations, setResignations] = useState<Resignation[]>([])
  const [loading, setLoading]           = useState(true)
  const [acting, setActing]             = useState<string | null>(null)
  const [confirm, setConfirm]           = useState<{ id: string; action: 'accept' | 'cancel'; name: string } | null>(null)

  const fetchResignations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/resignations')
      if (res.ok) {
        const { resignations: data } = await res.json()
        setResignations(data || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchResignations() }, [fetchResignations])

  async function handleAction(id: string, action: 'accept' | 'cancel') {
    setActing(id)
    try {
      const res = await fetch(`/api/admin/resignations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setResignations(prev => prev.filter(r => r.id !== id))
      }
    } finally {
      setActing(null)
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Resignation Requests</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Employees who have submitted a resignation</p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={fetchResignations}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && (
        <div className="text-zinc-500 text-xs text-center py-8">Loading…</div>
      )}

      {!loading && resignations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <UserCheck className="w-8 h-8 text-zinc-700" />
          <p className="text-zinc-400 text-sm font-medium">No pending resignations</p>
          <p className="text-zinc-600 text-xs">All employees are currently active</p>
        </div>
      )}

      {!loading && resignations.length > 0 && (
        <div className="space-y-3">
          {resignations.map(r => {
            const days = daysUntil(r.last_working_date)
            const isUrgent = days !== null && days <= 7
            const isPast = days !== null && days < 0
            const isActing = acting === r.id
            return (
              <div
                key={r.id}
                className={`border rounded-lg overflow-hidden ${
                  isPast ? 'border-red-500/40 bg-red-500/5' :
                  isUrgent ? 'border-yellow-500/40 bg-yellow-500/5' :
                  'border-zinc-800 bg-zinc-900'
                }`}
              >
                <div className="px-4 py-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400 font-bold text-xs">
                      {r.first_name[0]}{r.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">
                          {r.first_name} {r.last_name}
                        </span>
                        {r.employee_code && (
                          <span className="text-[10px] text-zinc-500 font-mono">#{r.employee_code}</span>
                        )}
                        {isPast && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                            Past LWD
                          </span>
                        )}
                        {isUrgent && !isPast && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
                            {days}d left
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-[10px] text-zinc-500">{r.email}</span>
                        {r.department && <span className="text-[10px] text-zinc-500">{r.department}</span>}
                        {r.shifts && <span className="text-[10px] text-zinc-500">{r.shifts.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/60 rounded-md px-3 py-2">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Resignation Date</p>
                      <p className="text-xs font-medium text-zinc-200">{fmtDate(r.resignation_date)}</p>
                    </div>
                    <div className={`rounded-md px-3 py-2 ${isPast ? 'bg-red-500/10' : isUrgent ? 'bg-yellow-500/10' : 'bg-zinc-800/60'}`}>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Last Working Date</p>
                      <p className={`text-xs font-medium ${isPast ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-zinc-200'}`}>
                        {fmtDate(r.last_working_date)}
                        {days !== null && !isPast && (
                          <span className="text-zinc-500 font-normal ml-1">({days > 0 ? `${days}d` : 'today'})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                      disabled={isActing}
                      onClick={() => setConfirm({ id: r.id, action: 'accept', name: `${r.first_name} ${r.last_name}` })}
                    >
                      <UserX className="w-3 h-3" />
                      Accept & Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
                      disabled={isActing}
                      onClick={() => setConfirm({ id: r.id, action: 'cancel', name: `${r.first_name} ${r.last_name}` })}
                    >
                      <UserCheck className="w-3 h-3" />
                      Cancel Resignation
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                confirm.action === 'accept' ? 'bg-red-500/20' : 'bg-zinc-700'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${confirm.action === 'accept' ? 'text-red-400' : 'text-zinc-400'}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {confirm.action === 'accept' ? 'Accept Resignation' : 'Cancel Resignation'}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{confirm.name}</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {confirm.action === 'accept'
                ? 'This will deactivate the employee account. They will no longer be able to log in. This action cannot be undone.'
                : 'This will clear the resignation request and the employee will remain active. They can re-submit later.'}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className={`flex-1 h-8 text-xs ${
                  confirm.action === 'accept'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                }`}
                disabled={acting === confirm.id}
                onClick={() => handleAction(confirm.id, confirm.action)}
              >
                {acting === confirm.id ? 'Processing…' : confirm.action === 'accept' ? 'Yes, Deactivate' : 'Yes, Cancel It'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs border-zinc-700"
                disabled={acting === confirm.id}
                onClick={() => setConfirm(null)}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
