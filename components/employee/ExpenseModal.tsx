'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORIES = ['Travel', 'Food', 'Medical', 'Equipment', 'Accommodation', 'Other'] as const

interface Props {
  open: boolean
  onClose: () => void
}

export function ExpenseModal({ open, onClose }: Props) {
  const [amount, setAmount]       = useState('')
  const [category, setCategory]   = useState<string>(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  function reset() {
    setAmount(''); setCategory(CATEGORIES[0]); setDescription('')
    setError(''); setSuccess(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    if (!description.trim()) { setError('Description is required'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/employees/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          category,
          description: description.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Submission failed'); return }
      setSuccess(true)
      setTimeout(handleClose, 1500)
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Request Expense Reimbursement</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-green-400 font-semibold">✓ Expense submitted!</p>
            <p className="text-zinc-500 text-xs mt-1">Your manager will review it shortly.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-9 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Amount (₹)</label>
              <Input
                type="number"
                placeholder="500"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                className="h-9 text-sm bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Description</label>
              <Input
                placeholder="Brief description of the expense…"
                value={description}
                onChange={e => { setDescription(e.target.value); setError('') }}
                className="h-9 text-sm bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
              <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
