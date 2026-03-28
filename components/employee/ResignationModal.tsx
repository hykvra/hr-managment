'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

interface Props {
  resignationStatus: boolean
  resignationDate: string | null
  lastWorkingDate: string | null
  open: boolean
  onClose: () => void
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

export function ResignationModal({
  resignationStatus, resignationDate, lastWorkingDate, open, onClose,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  function handleClose() {
    setError('')
    setConfirmed(false)
    onClose()
  }

  async function handleAction(action: 'submit' | 'withdraw') {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/resignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      router.refresh()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <DialogTitle className="text-white">Resignation</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            {resignationStatus ? 'Your resignation is currently active' : 'Submit your resignation notice'}
          </DialogDescription>
        </DialogHeader>

        {resignationStatus ? (
          <div className="space-y-4 mt-2">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Resignation Date</span>
                <span className="text-white">{resignationDate ? fmt(resignationDate) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Last Working Date</span>
                <span className="text-red-300 font-medium">{lastWorkingDate ? fmt(lastWorkingDate) : '—'}</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs">
              You can withdraw your resignation before your last working date if you change your mind.
            </p>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-zinc-700">
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => handleAction('withdraw')}
                disabled={loading}
              >
                {loading ? 'Processing…' : 'Withdraw Resignation'}
              </Button>
            </div>
          </div>
        ) : !confirmed ? (
          <div className="space-y-4 mt-2">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="text-yellow-300 font-medium">Before you proceed</p>
                <ul className="text-zinc-400 space-y-1 text-xs list-disc pl-4">
                  <li>Your last working date will be 30 days from today</li>
                  <li>This will notify your HR team immediately</li>
                  <li>You can withdraw before your last working date</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setConfirmed(true)}
              >
                I Understand, Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <p className="text-zinc-300 text-sm">
              Are you sure you want to submit your resignation? Your last working day will be{' '}
              <span className="text-white font-medium">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>.
            </p>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmed(false)} className="flex-1 border-zinc-700">
                Go Back
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleAction('submit')}
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Submit Resignation'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
