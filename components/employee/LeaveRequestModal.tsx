'use client'

import { useState, useEffect } from 'react'
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

type LeaveTypeOption = { id: string; name: string; color: string; annual_quota: number }

// Fallback if tenant has no custom leave types configured yet
const FALLBACK_TYPES: LeaveTypeOption[] = [
  { id: 'Sick',     name: 'Sick Leave',            color: '#ef4444', annual_quota: 12 },
  { id: 'Casual',   name: 'Casual Leave',           color: '#f59e0b', annual_quota: 12 },
  { id: 'Earned',   name: 'Earned Leave',           color: '#10b981', annual_quota: 15 },
  { id: 'Vacation', name: 'Vacation (Multi-day)',   color: '#3b82f6', annual_quota: 10 },
]

interface Props {
  leaveBalance: number
  open: boolean
  onClose: () => void
}

export function LeaveRequestModal({ leaveBalance, open, onClose }: Props) {
  const router = useRouter()
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>(FALLBACK_TYPES)
  const [leaveType, setLeaveType] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // Fetch custom leave types when modal opens
  useEffect(() => {
    if (!open) return
    fetch('/api/admin/leave-types')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const types = data?.leave_types?.filter((lt: LeaveTypeOption & { is_active?: boolean }) => lt.is_active !== false)
        if (types && types.length > 0) setLeaveTypes(types)
        else setLeaveTypes(FALLBACK_TYPES)
      })
      .catch(() => setLeaveTypes(FALLBACK_TYPES))
  }, [open])

  function handleTypeChange(val: string) {
    setLeaveType(val)
    // Multi-day for any type if user selects it — the type name doesn't gate it anymore
    setIsMultiDay(false)
    setEndDate('')
    setError('')
  }

  function handleClose() {
    setLeaveType('')
    setLeaveDate('')
    setEndDate('')
    setIsMultiDay(false)
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
    if (isMultiDay && !endDate) {
      setError('End date is required for multi-day leave')
      return
    }
    if (isMultiDay && endDate <= leaveDate) {
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
          end_date: isMultiDay ? endDate : null,
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
                  {leaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.name} className="text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: lt.color }} />
                        {lt.name}
                        <span className="text-zinc-500 text-xs">({lt.annual_quota} days/yr)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">
                {isMultiDay ? 'Start Date *' : 'Date *'}
              </Label>
              <Input
                type="date"
                value={leaveDate}
                onChange={e => { setLeaveDate(e.target.value); setError('') }}
                min={today}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Multi-day toggle */}
            {leaveDate && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isMultiDay}
                  onChange={e => { setIsMultiDay(e.target.checked); setEndDate('') }}
                  className="w-4 h-4 accent-blue-500" />
                <span className="text-zinc-300 text-sm">Multi-day leave</span>
              </label>
            )}

            {isMultiDay && (
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
