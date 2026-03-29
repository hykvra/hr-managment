'use client'

import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PunchData = {
  status: string | null
  clock_in_time: string | null
  clock_out_time: string | null
} | null

function fmtTime(t: string | null): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function calcHours(inTime: string, outTime: string): string {
  const [ih, im] = inTime.split(':').map(Number)
  const [oh, om] = outTime.split(':').map(Number)
  const mins = oh * 60 + om - (ih * 60 + im)
  if (mins < 0) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function ClockWidget() {
  const [punch, setPunch]     = useState<PunchData>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/employees/clockin')
      .then(r => r.json())
      .then(d => setPunch(d.punch ?? null))
      .catch(() => {/* silent */})
      .finally(() => setLoading(false))
  }, [])

  async function handlePunch(action: 'in' | 'out') {
    setActing(true)
    setError('')
    try {
      const res  = await fetch('/api/employees/clockin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      // Refresh
      const r2 = await fetch('/api/employees/clockin')
      const d2 = await r2.json()
      setPunch(d2.punch ?? null)
    } catch {
      setError('Network error')
    } finally {
      setActing(false)
    }
  }

  const canClockIn  = !loading && !punch?.clock_in_time
  const canClockOut = !loading && !!punch?.clock_in_time && !punch?.clock_out_time
  const shiftDone   = !!punch?.clock_out_time

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Today&apos;s Punch
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {loading ? (
          <p className="text-zinc-500 text-xs">Loading…</p>
        ) : (
          <>
            {/* Times row */}
            <div className="flex gap-5">
              <div>
                <p className="text-zinc-500 text-[10px] mb-0.5">Clock In</p>
                <p className={`font-mono font-semibold text-sm ${punch?.clock_in_time ? 'text-green-400' : 'text-zinc-600'}`}>
                  {fmtTime(punch?.clock_in_time ?? null)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] mb-0.5">Clock Out</p>
                <p className={`font-mono font-semibold text-sm ${punch?.clock_out_time ? 'text-orange-400' : 'text-zinc-600'}`}>
                  {fmtTime(punch?.clock_out_time ?? null)}
                </p>
              </div>
              {punch?.clock_in_time && punch?.clock_out_time && (
                <div>
                  <p className="text-zinc-500 text-[10px] mb-0.5">Hours</p>
                  <p className="font-mono font-semibold text-sm text-blue-400">
                    {calcHours(punch.clock_in_time, punch.clock_out_time)}
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 items-center">
              {canClockIn && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                  disabled={acting}
                  onClick={() => handlePunch('in')}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {acting ? 'Clocking In…' : 'Clock In'}
                </Button>
              )}
              {canClockOut && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-orange-600 hover:bg-orange-700"
                  disabled={acting}
                  onClick={() => handlePunch('out')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {acting ? 'Clocking Out…' : 'Clock Out'}
                </Button>
              )}
              {shiftDone && (
                <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                  ✓ Shift complete
                </span>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
