'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

interface Props {
  baseSalary: number
  hasPendingAdvance: boolean
  open: boolean
  onClose: () => void
}

export function SalaryAdvanceModal({ baseSalary, hasPendingAdvance, open, onClose }: Props) {
  const router = useRouter()
  const maxAdvance = baseSalary * 0.5
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleClose() {
    setAmount('')
    setReason('')
    setError('')
    setSuccess(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const parsed = Number(amount)
    if (!parsed || parsed <= 0) { setError('Enter a valid amount'); return }
    if (parsed > maxAdvance) {
      setError(`Maximum advance allowed is ₹${maxAdvance.toLocaleString('en-IN')}`)
      return
    }
    if (!reason.trim()) { setError('Reason is required'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/salary-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to submit'); return }
      setSuccess(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-400" />
            </div>
            <DialogTitle className="text-white">Request Salary Advance</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Max allowed: <span className="text-white font-medium">₹{maxAdvance.toLocaleString('en-IN')}</span> (50% of base salary)
          </DialogDescription>
        </DialogHeader>

        {hasPendingAdvance ? (
          <div className="py-4 text-center">
            <p className="text-yellow-400 text-sm">You already have a pending advance request.</p>
            <p className="text-zinc-400 text-xs mt-1">Please wait for it to be processed before submitting another.</p>
            <Button onClick={handleClose} className="mt-4 w-full" variant="outline">Close</Button>
          </div>
        ) : success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-white font-medium">Advance request submitted</p>
            <p className="text-zinc-400 text-sm mt-1">Pending admin approval</p>
            <Button onClick={handleClose} className="mt-4 w-full" variant="outline">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Amount (₹) *</Label>
              <Input
                type="number"
                placeholder={`Up to ₹${maxAdvance.toLocaleString('en-IN')}`}
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                min={1}
                max={maxAdvance}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              {amount && Number(amount) > 0 && (
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((Number(amount) / maxAdvance) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Reason *</Label>
              <Textarea
                placeholder="Brief reason for the advance request"
                value={reason}
                onChange={e => { setReason(e.target.value); setError('') }}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
