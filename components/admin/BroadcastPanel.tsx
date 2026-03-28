'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type Shift = { id: string; name: string }

type BroadcastData = {
  id: string
  message: string
  target_shift: string
  created_at: string
  employees: { first_name: string; last_name: string } | null
}

interface Props {
  shifts: Shift[]
  recentBroadcasts: BroadcastData[]
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export function BroadcastPanel({ shifts, recentBroadcasts }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [targetShift, setTargetShift] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSend() {
    if (!message.trim()) { setError('Message is required'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), target_shift: targetShift }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send'); return }
      setMessage('')
      setTargetShift('All')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
        <p className="text-zinc-300 text-sm font-medium">Send Broadcast</p>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Target</Label>
          <Select value={targetShift} onValueChange={setTargetShift}>
            <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="All" className="text-zinc-200">All Employees</SelectItem>
              {shifts.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-zinc-200">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Message</Label>
          <Textarea
            rows={3}
            placeholder="Type your broadcast message…"
            value={message}
            onChange={e => { setMessage(e.target.value); setError('') }}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">Broadcast sent successfully</p>}
        <Button className="w-full gap-2" disabled={loading} onClick={handleSend}>
          <Send className="w-3.5 h-3.5" />
          {loading ? 'Sending…' : 'Send Broadcast'}
        </Button>
      </div>

      {/* Recent broadcasts */}
      {recentBroadcasts.length > 0 && (
        <>
          <Separator className="bg-zinc-800" />
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Recent Broadcasts</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentBroadcasts.map(b => (
              <div key={b.id} className="bg-zinc-800/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                    {b.target_shift === 'All' ? 'All Employees' : b.target_shift}
                  </span>
                  <span className="text-zinc-600 text-xs">{fmt(b.created_at)}</span>
                </div>
                <p className="text-zinc-300 text-sm">{b.message}</p>
                {b.employees && (
                  <p className="text-zinc-600 text-xs mt-1">by {b.employees.first_name} {b.employees.last_name}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
