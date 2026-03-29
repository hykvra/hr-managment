'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Employee = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
}

type Loan = {
  id: string
  amount: number
  reason: string
  emi_amount: number
  disbursed_on: string
  months_total: number
  months_paid: number
  status: 'active' | 'cleared' | 'cancelled'
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}

const STATUS_CLS: Record<string, string> = {
  active:    'bg-green-500/10 text-green-400 border-green-500/20',
  cleared:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

function fmtMoney(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }
function fmtDate(d: string)  { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

export function LoanManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const empFetched = useRef(false)
  const router = useRouter()
  const [loans, setLoans]       = useState<Loan[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    employee_id: '',
    amount: '',
    reason: '',
    emi_amount: '',
    months_total: '',
    disbursed_on: new Date().toISOString().slice(0, 10),
  })

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/loans?${params}`)
      if (res.ok) {
        const { loans: data } = await res.json()
        setLoans(data || [])
      }
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchLoans() }, [fetchLoans])

  useEffect(() => {
    if (empFetched.current) return
    empFetched.current = true
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .catch(() => {/* silent */})
  }, [])

  function autoFillEmi() {
    const amt = Number(form.amount)
    const mo  = Number(form.months_total)
    if (amt > 0 && mo > 0 && !form.emi_amount) {
      setForm(f => ({ ...f, emi_amount: String(Math.ceil(amt / mo)) }))
    }
  }

  async function handleCreate() {
    if (!form.employee_id || !form.amount || !form.reason.trim() || !form.emi_amount || !form.months_total) {
      setError('All fields are required'); return
    }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employee_id,
          amount: Number(form.amount),
          reason: form.reason.trim(),
          emi_amount: Number(form.emi_amount),
          months_total: Number(form.months_total),
          disbursed_on: form.disbursed_on,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setShowForm(false)
      setForm({ employee_id: '', amount: '', reason: '', emi_amount: '', months_total: '', disbursed_on: new Date().toISOString().slice(0, 10) })
      await fetchLoans()
      router.refresh()
    } finally { setSubmitting(false) }
  }

  async function handleAction(loanId: string, action: 'record_payment' | 'cancel') {
    setActingId(loanId)
    try {
      const res = await fetch(`/api/admin/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        await fetchLoans()
        router.refresh()
      }
    } finally { setActingId(null) }
  }

  const remaining = (l: Loan) => l.months_total - l.months_paid
  const balance   = (l: Loan) => Math.max(0, l.amount - l.emi_amount * l.months_paid)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All Loans</option>
        </select>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 ml-auto"
          onClick={() => { setShowForm(s => !s); setError('') }}
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'New Loan'}
        </Button>
      </div>

      {/* New loan form */}
      {showForm && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <p className="text-zinc-300 text-xs font-semibold">Create New Loan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Employee</label>
              <select
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name}{e.employee_code ? ` #${e.employee_code}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Loan Amount (₹)</label>
              <Input
                type="number"
                placeholder="50000"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value, emi_amount: '' }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Reason</label>
              <Input
                placeholder="Medical / personal / other"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Total Months</label>
              <Input
                type="number"
                placeholder="6"
                value={form.months_total}
                onChange={e => setForm(f => ({ ...f, months_total: e.target.value, emi_amount: '' }))}
                onBlur={autoFillEmi}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Monthly EMI (₹)</label>
              <Input
                type="number"
                placeholder="Auto-filled"
                value={form.emi_amount}
                onChange={e => setForm(f => ({ ...f, emi_amount: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Disbursed On</label>
              <Input
                type="date"
                value={form.disbursed_on}
                onChange={e => setForm(f => ({ ...f, disbursed_on: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Loan'}
            </Button>
          </div>
        </div>
      )}

      {/* Loan list */}
      {loading && <div className="text-zinc-500 text-xs py-4 text-center">Loading loans…</div>}
      {!loading && loans.length === 0 && (
        <div className="text-zinc-500 text-sm py-8 text-center">No {statusFilter === 'all' ? '' : statusFilter} loans found</div>
      )}

      {!loading && loans.length > 0 && (
        <div className="space-y-2">
          {loans.map(loan => {
            const rem = remaining(loan)
            const bal = balance(loan)
            const pct = loan.months_total > 0 ? Math.round((loan.months_paid / loan.months_total) * 100) : 0
            return (
              <div key={loan.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">
                        {loan.employees.first_name} {loan.employees.last_name}
                      </span>
                      {loan.employees.employee_code && (
                        <span className="text-zinc-500 text-[10px] font-mono">#{loan.employees.employee_code}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CLS[loan.status]}`}>
                        {loan.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">{loan.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-bold text-sm">{fmtMoney(loan.amount)}</p>
                    <p className="text-zinc-500 text-[10px]">Disbursed {fmtDate(loan.disbursed_on)}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 text-xs">
                  <div>
                    <p className="text-zinc-500 text-[10px]">EMI / Month</p>
                    <p className="text-zinc-200 font-medium">{fmtMoney(loan.emi_amount)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px]">Installments</p>
                    <p className="text-zinc-200 font-medium">{loan.months_paid} / {loan.months_total}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px]">Remaining</p>
                    <p className="text-zinc-200 font-medium">{rem} months · {fmtMoney(bal)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>{pct}% repaid</span>
                    <span>Balance: {fmtMoney(bal)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${loan.status === 'cleared' ? 'bg-blue-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                {loan.status === 'active' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-[10px] bg-green-600 hover:bg-green-700"
                      disabled={actingId === loan.id}
                      onClick={() => handleAction(loan.id, 'record_payment')}
                    >
                      {actingId === loan.id ? '…' : '✓ Record EMI Payment'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] border-red-600/40 text-red-400 hover:bg-red-900/20"
                      disabled={actingId === loan.id}
                      onClick={() => handleAction(loan.id, 'cancel')}
                    >
                      Cancel Loan
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
