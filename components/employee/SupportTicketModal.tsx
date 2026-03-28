'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
}

export function SupportTicketModal({ open, onClose }: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleClose() {
    setSubject('')
    setMessage('')
    setError('')
    setSuccess(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!subject.trim()) { setError('Subject is required'); return }
    if (!message.trim()) { setError('Message is required'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
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
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <DialogTitle className="text-white">New Support Ticket</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Raise a query or issue for the HR team
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-white font-medium">Ticket submitted</p>
            <p className="text-zinc-400 text-sm mt-1">The HR team will respond shortly</p>
            <Button onClick={handleClose} className="mt-4 w-full" variant="outline">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Subject *</Label>
              <Input
                placeholder="Brief subject of your issue"
                value={subject}
                onChange={e => { setSubject(e.target.value); setError('') }}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Message *</Label>
              <Textarea
                placeholder="Describe your issue in detail"
                value={message}
                onChange={e => { setMessage(e.target.value); setError('') }}
                rows={4}
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
                {loading ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
