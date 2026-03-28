'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

type AdvanceWithEmployee = {
  id: string
  amount: number
  approved_amount: number | null
  reason: string
  status: string
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null; base_salary: number }
}

interface Props {
  pendingAdvances: AdvanceWithEmployee[]
  recentApprovedAdvances: AdvanceWithEmployee[]
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function buildVoucherHtml(adv: AdvanceWithEmployee): string {
  const emp = adv.employees
  const approvedAmt = Number(adv.approved_amount || adv.amount).toLocaleString('en-IN')
  const requestedAmt = Number(adv.amount).toLocaleString('en-IN')
  const dateStr = fmt(adv.created_at)

  return [
    '<!DOCTYPE html><html><head><title>Advance Voucher</title>',
    '<style>',
    '@page { size: A5 landscape; margin: 12mm; }',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }',
    '.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }',
    '.header h1 { font-size: 18px; font-weight: bold; }',
    '.header h2 { font-size: 12px; margin-top: 3px; letter-spacing: 3px; color: #444; }',
    '.row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ddd; }',
    '.label { color: #555; }',
    '.amount-box { font-size: 22px; font-weight: bold; text-align: center; padding: 12px; border: 2px solid #000; margin: 14px 0; border-radius: 4px; }',
    '.signatures { display: flex; justify-content: space-between; margin-top: 28px; }',
    '.sig { text-align: center; }',
    '.sig-line { border-top: 1px solid #000; width: 130px; margin: 0 auto 4px; }',
    '.sig-label { font-size: 10px; color: #555; }',
    '</style></head><body>',
    '<div class="header">',
    '<h1>ESAM HR Portal</h1>',
    '<h2>SALARY ADVANCE VOUCHER</h2>',
    '</div>',
    '<div class="row"><span class="label">Employee Name</span><strong>' + emp.first_name + ' ' + emp.last_name + '</strong></div>',
    '<div class="row"><span class="label">Employee Code</span><strong>' + (emp.employee_code || '—') + '</strong></div>',
    '<div class="row"><span class="label">Date</span><span>' + dateStr + '</span></div>',
    '<div class="row"><span class="label">Reason</span><span>' + adv.reason + '</span></div>',
    '<div class="amount-box">&#8377; ' + approvedAmt + '</div>',
    '<div class="row"><span class="label">Requested Amount</span><span>&#8377;' + requestedAmt + '</span></div>',
    '<div class="row"><span class="label">Approved Amount</span><strong style="color:#16a34a">&#8377;' + approvedAmt + '</strong></div>',
    '<div class="signatures">',
    '<div class="sig"><div class="sig-line"></div><div class="sig-label">Authorized Signature</div></div>',
    '<div class="sig"><div class="sig-line"></div><div class="sig-label">Employee Signature</div></div>',
    '</div>',
    '</body></html>',
  ].join('')
}

function printVoucher(adv: AdvanceWithEmployee) {
  const html = buildVoucherHtml(adv)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => {
      win.print()
      URL.revokeObjectURL(url)
    }
  } else {
    URL.revokeObjectURL(url)
  }
}

export function AdvanceManagement({ pendingAdvances, recentApprovedAdvances }: Props) {
  const router = useRouter()
  const [approveId, setApproveId] = useState<string | null>(null)
  const [approveForm, setApproveForm] = useState({ approved_amount: '', comment: '' })
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectComments, setRejectComments] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const selectedAdvance = pendingAdvances.find(a => a.id === approveId)

  function openApprove(adv: AdvanceWithEmployee) {
    setApproveId(adv.id)
    setApproveForm({ approved_amount: String(adv.amount), comment: '' })
    setError('')
  }

  async function handleApprove() {
    if (!approveForm.approved_amount || Number(approveForm.approved_amount) <= 0) {
      setError('Approved amount is required')
      return
    }
    setLoadingId(approveId)
    setError('')
    try {
      const res = await fetch(`/api/admin/advances/${approveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          approved_amount: Number(approveForm.approved_amount),
          comment: approveForm.comment,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setApproveId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function handleReject(id: string) {
    setLoadingId(id)
    try {
      await fetch(`/api/admin/advances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', comment: rejectComments[id] }),
      })
      setRejectingId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pending */}
      {pendingAdvances.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-zinc-500 text-sm">No pending advance requests</div>
      ) : (
        <div className="space-y-2">
          {pendingAdvances.map(adv => {
            const emp = adv.employees
            const maxAllowed = Number(emp.base_salary) * 0.5
            return (
              <div key={adv.id} className="bg-zinc-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</span>
                    {emp.employee_code && <span className="text-zinc-500 text-xs font-mono">#{emp.employee_code}</span>}
                    <span className="text-yellow-400 font-semibold text-sm">
                      &#8377;{Number(adv.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-zinc-500 text-xs">(max &#8377;{maxAllowed.toLocaleString('en-IN')})</span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">{adv.reason}</p>
                  <p className="text-zinc-600 text-xs">{fmt(adv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rejectingId === adv.id ? (
                    <>
                      <Input
                        placeholder="Reason (optional)"
                        value={rejectComments[adv.id] || ''}
                        onChange={e => setRejectComments(c => ({ ...c, [adv.id]: e.target.value }))}
                        className="h-7 text-xs bg-zinc-700 border-zinc-600 text-white w-32 placeholder:text-zinc-500"
                      />
                      <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 shrink-0"
                        disabled={loadingId === adv.id} onClick={() => handleReject(adv.id)}>Confirm</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline"
                        className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        disabled={loadingId === adv.id} onClick={() => setRejectingId(adv.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        disabled={loadingId === adv.id} onClick={() => openApprove(adv)}>
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recently approved */}
      {recentApprovedAdvances.length > 0 && (
        <>
          <Separator className="bg-zinc-800" />
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Recently Approved</p>
          <div className="space-y-2">
            {recentApprovedAdvances.map(adv => (
              <div key={adv.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-sm">{adv.employees.first_name} {adv.employees.last_name}</span>
                    <span className="text-green-400 font-medium text-sm">
                      &#8377;{Number(adv.approved_amount || adv.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs">{adv.reason} · {fmt(adv.created_at)}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 gap-1 shrink-0"
                  onClick={() => printVoucher(adv)}>
                  <Printer className="w-3 h-3" /> Voucher
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approve modal */}
      <Dialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">
              Approve — {selectedAdvance?.employees.first_name} {selectedAdvance?.employees.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Approved Amount (&#8377;) *</Label>
              <Input type="number" value={approveForm.approved_amount}
                onChange={e => setApproveForm(f => ({ ...f, approved_amount: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white" />
              {selectedAdvance && (
                <p className="text-zinc-500 text-xs">
                  Requested: &#8377;{Number(selectedAdvance.amount).toLocaleString('en-IN')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Comment (optional)</Label>
              <Textarea rows={2} value={approveForm.comment}
                onChange={e => setApproveForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Any notes for the employee" />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setApproveId(null)} className="flex-1 border-zinc-700">Cancel</Button>
              <Button onClick={handleApprove} disabled={!!loadingId} className="flex-1 bg-green-600 hover:bg-green-700">
                {loadingId ? 'Approving…' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
