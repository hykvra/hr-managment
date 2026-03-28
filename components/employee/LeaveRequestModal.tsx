'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  leaveBalance: number
  open: boolean
  onClose: () => void
}

export function LeaveRequestModal({ leaveBalance, open, onClose }: Props) {
  const router = useRouter()
  const [leaveType, setLeaveType] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isVacation, setIsVacation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  function handleTypeChange(val: string) {
    setLeaveType(val)
    setIsVacation(val === 'Vacation')
    setEndDate('')
    setError('')
  }

  function handleClose() {
    setLeaveType('')
    setLeaveDate('')
    setEndDate('')
    setIsVacation(false)
    setError('')
    setSuccess(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!leaveType || !leaveDate) {
      setError('Please fill in all required fields')
      return
    }
    if (isVacation && !endDate) {
      setError('End date is required for vacation leave')
      return
    }
    if (isVacation && endDate <= leaveDate) {
      setError('End date must be after start date')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          leave_date: leaveDate,
          end_date: isVacation ? endDate : null,
        }),
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
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <DialogTitle className="text-white">Apply for Leave</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            You have <span className="text-white font-medium">{leaveBalance}</span> days remaining
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-white font-medium">Leave request submitted</p>
            <p className="text-zinc-400 text-sm mt-1">Your request is pending approval</p>
            <Button onClick={handleClose} className="mt-4 w-full" variant="outline">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Leave Type *</Label>
              <Select value={leaveType} onValueChange={handleTypeChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Sick" className="text-zinc-200">Sick Leave</SelectItem>
                  <SelectItem value="Casual" className="text-zinc-200">Casual Leave</SelectItem>
                  <SelectItem value="Earned" className="text-zinc-200">Earned Leave</SelectItem>
                  <SelectItem value="Vacation" className="text-zinc-200">Vacation (Multi-day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">
                {isVacation ? 'Start Date *' : 'Date *'}
              </Label>
              <Input
                type="date"
                value={leaveDate}
                onChange={e => { setLeaveDate(e.target.value); setError('') }}
                min={today}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {isVacation && (
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">End Date *</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setError('') }}
                  min={leaveDate || today}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            )}

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
