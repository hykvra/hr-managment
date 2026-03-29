'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Regularization = {
  id: string
  date: string
  current_status: string | null
  requested_status: string
  reason: string
  status: string
  manager_note: string | null
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}

const STATUS_CLS: Record<string, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  Present: 'Present', HalfDay: 'Half Day', DoubleShift: 'Double Shift',
  Absent: 'Absent', ApprovedLeave: 'Approved Leave', Uninformed: 'Uninformed',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function RegularizationManagement() {
  const [regs, setRegs]         = useState<Regularization[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<Regularization | null>(null)
  const [note, setNote]         = useState('')

  const fetchRegs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/regularization?status=${filter}`)
      if (res.ok) {
        const { regularizations: data } = await res.json()
        setRegs(data || [])
      }
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchRegs() }, [fetchRegs])

  async function handleAction(id: string, action: 'approve' | 'reject', managerNote?: string) {
    setActingId(id)
    try {
      const res = await fetch('/api/admin/regularization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, manager_note: managerNote }),
      })
      if (res.ok) { setNoteModal(null); await fetchRegs() }
    } finally { setActingId(null) }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading && <div className="text-zinc-500 text-xs py-4 text-center">Loading…</div>}
      {!loading && regs.length === 0 && (
        <div className="text-zinc-500 text-sm py-8 text-center">
          No {filter === 'all' ? '' : filter} regularization requests
        </div>
      )}

      {!loading && regs.length > 0 && (
        <div className="space-y-2">
          {regs.map(reg => (
            <div key={reg.id} className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {reg.employees.first_name} {reg.employees.last_name}
                    </span>
                    {reg.employees.employee_code && (
                      <span className="text-zinc-500 text-[10px] font-mono">#{reg.employees.employee_code}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CLS[reg.status]}`}>
                      {reg.status}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">{reg.reason}</p>
                  {reg.manager_note && (
                    <p className="text-zinc-500 text-[10px] mt-0.5 italic">Note: {reg.manager_note}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-medium text-xs">{fmtDate(reg.date)}</p>
                  <div className="flex items-center gap-1 justify-end mt-1 text-[10px]">
                    {reg.current_status && (
                      <span className="text-zinc-500">{STATUS_LABEL[reg.current_status] || reg.current_status}</span>
                    )}
                    {reg.current_status && <span className="text-zinc-600">→</span>}
                    <span className="text-blue-400 font-medium">{STATUS_LABEL[reg.requested_status] || reg.requested_status}</span>
                  </div>
                </div>
              </div>

              {reg.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-green-600 hover:bg-green-700 gap-1"
                    disabled={actingId === reg.id}
                    onClick={() => handleAction(reg.id, 'approve')}
                  >
                    <Check className="w-3 h-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-red-600/40 text-red-400 hover:bg-red-900/20 gap-1"
                    disabled={actingId === reg.id}
                    onClick={() => { setNoteModal(reg); setNote('') }}
                  >
                    <X className="w-3 h-3" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject with note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <p className="text-white font-semibold text-sm">Reject Regularization</p>
            <p className="text-zinc-400 text-xs">
              {noteModal.employees.first_name} {noteModal.employees.last_name} · {fmtDate(noteModal.date)}
            </p>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Reason for rejection (optional)</label>
              <Input
                placeholder="Tell the employee why…"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs bg-red-600 hover:bg-red-700 flex-1"
                disabled={actingId === noteModal.id}
                onClick={() => handleAction(noteModal.id, 'reject', note)}
              >
                Confirm Reject
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 flex-1" onClick={() => setNoteModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
