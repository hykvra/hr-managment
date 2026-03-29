'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUSES = [
  { value: 'Present',       label: 'Present' },
  { value: 'HalfDay',       label: 'Half Day' },
  { value: 'DoubleShift',   label: 'Double Shift' },
  { value: 'ApprovedLeave', label: 'Approved Leave' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function RegularizationModal({ open, onClose }: Props) {
  const [date, setDate]               = useState('')
  const [requestedStatus, setReqStatus] = useState('Present')
  const [reason, setReason]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  // Default date to today
  const today = new Date().toISOString().slice(0, 10)

  function reset() { setDate(''); setReason(''); setError(''); setSuccess(false); setReqStatus('Present') }
  function handleClose() { reset(); onClose() }

  async function handleSubmit() {
    if (!date) { setError('Select a date'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/employees/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, requested_status: requestedStatus, reason: reason.trim() }),
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
          <DialogTitle className="text-base">Attendance Regularization</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-green-400 font-semibold">✓ Request submitted!</p>
            <p className="text-zinc-500 text-xs mt-1">Your manager will review it shortly.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <p className="text-zinc-400 text-xs">
              Request a correction for a date when your attendance was marked incorrectly.
            </p>

            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Date</label>
              <Input
                type="date"
                value={date}
                max={today}
                onChange={e => { setDate(e.target.value); setError('') }}
                className="h-9 text-sm bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Correct Status</label>
              <select
                value={requestedStatus}
                onChange={e => setReqStatus(e.target.value)}
                className="w-full h-9 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 text-xs">Reason</label>
              <Input
                placeholder="Why should this be corrected?"
                value={reason}
                onChange={e => { setReason(e.target.value); setError('') }}
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
