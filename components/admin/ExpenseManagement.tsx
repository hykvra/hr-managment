'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Expense = {
  id: string
  amount: number
  category: string
  description: string
  receipt_url: string | null
  status: string
  approved_amount: number | null
  manager_note: string | null
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}

const STATUS_CLS: Record<string, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const CATEGORY_ICON: Record<string, string> = {
  Travel: '✈️', Food: '🍽️', Medical: '🏥', Equipment: '🖥️', Accommodation: '🏨', Other: '📎',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ExpenseManagement() {
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actingId, setActingId]     = useState<string | null>(null)
  const [approveModal, setApproveModal] = useState<Expense | null>(null)
  const [approvedAmt, setApprovedAmt]   = useState('')
  const [managerNote, setManagerNote]   = useState('')

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/expenses?status=${statusFilter}`)
      if (res.ok) {
        const { expenses: data } = await res.json()
        setExpenses(data || [])
      }
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  async function handleAction(id: string, action: 'approve' | 'reject', extra?: { approved_amount?: number; manager_note?: string }) {
    setActingId(id)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra }),
      })
      if (res.ok) await fetchExpenses()
    } finally { setActingId(null) }
  }

  function openApprove(exp: Expense) {
    setApproveModal(exp)
    setApprovedAmt(String(exp.amount))
    setManagerNote('')
  }

  async function confirmApprove() {
    if (!approveModal) return
    await handleAction(approveModal.id, 'approve', {
      approved_amount: Number(approvedAmt) || undefined,
      manager_note: managerNote || undefined,
    })
    setApproveModal(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading && <div className="text-zinc-500 text-xs py-4 text-center">Loading…</div>}
      {!loading && expenses.length === 0 && (
        <div className="text-zinc-500 text-sm py-8 text-center">
          No {statusFilter === 'all' ? '' : statusFilter} expense requests
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{CATEGORY_ICON[exp.category] || '📎'}</span>
                    <span className="text-white text-sm font-medium">
                      {exp.employees.first_name} {exp.employees.last_name}
                    </span>
                    {exp.employees.employee_code && (
                      <span className="text-zinc-500 text-[10px] font-mono">#{exp.employees.employee_code}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CLS[exp.status]}`}>
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    <span className="text-zinc-500">{exp.category}</span> · {exp.description}
                  </p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{fmtDate(exp.created_at)}</p>
                  {exp.manager_note && (
                    <p className="text-zinc-500 text-[10px] mt-0.5 italic">Note: {exp.manager_note}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-sm">₹{Math.round(exp.amount).toLocaleString('en-IN')}</p>
                  {exp.approved_amount && exp.approved_amount !== exp.amount && (
                    <p className="text-green-400 text-[10px]">Approved: ₹{Math.round(exp.approved_amount).toLocaleString('en-IN')}</p>
                  )}
                  {exp.receipt_url && (
                    <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 text-[10px] hover:underline">View receipt</a>
                  )}
                </div>
              </div>

              {exp.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-green-600 hover:bg-green-700 gap-1"
                    disabled={actingId === exp.id}
                    onClick={() => openApprove(exp)}
                  >
                    <Check className="w-3 h-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-red-600/40 text-red-400 hover:bg-red-900/20 gap-1"
                    disabled={actingId === exp.id}
                    onClick={() => handleAction(exp.id, 'reject')}
                  >
                    <X className="w-3 h-3" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <p className="text-white font-semibold text-sm">Approve Expense</p>
            <p className="text-zinc-400 text-xs">
              {approveModal.employees.first_name} {approveModal.employees.last_name} ·{' '}
              {approveModal.category} · Requested ₹{Math.round(approveModal.amount).toLocaleString('en-IN')}
            </p>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Approved Amount (₹)</label>
              <Input
                type="number"
                value={approvedAmt}
                onChange={e => setApprovedAmt(e.target.value)}
                className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Note (optional)</label>
              <Input
                placeholder="Any remarks…"
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
                className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 flex-1" onClick={confirmApprove}>
                Confirm Approve
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 flex-1" onClick={() => setApproveModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
