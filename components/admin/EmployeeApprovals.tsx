'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type PendingEmployee = {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  dob: string
  gender: string
  profile_photo: string | null
  created_at: string
}

type Shift = { id: string; name: string; start_time: string; end_time: string }

interface Props {
  pendingEmployees: PendingEmployee[]
  shifts: Shift[]
}

export function EmployeeApprovals({ pendingEmployees, shifts }: Props) {
  const router = useRouter()
  const [approveId, setApproveId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employee_code: '', base_salary: '', shift_id: '', monthly_leave_quota: '1.5' })

  const selectedEmployee = pendingEmployees.find(e => e.id === approveId)

  function openApprove(id: string) {
    setApproveId(id)
    setError('')
    setForm({ employee_code: '', base_salary: '', shift_id: '', monthly_leave_quota: '1.5' })
  }

  async function handleApprove() {
    if (!form.employee_code.trim()) { setError('Employee code is required'); return }
    if (!form.base_salary || Number(form.base_salary) <= 0) { setError('Valid base salary is required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/employees/${approveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setApproveId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(id: string) {
    setLoading(true)
    try {
      await fetch(`/api/admin/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      setRejectId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (pendingEmployees.length === 0) {
    return <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No pending registrations</div>
  }

  return (
    <div className="space-y-3">
      {pendingEmployees.map(emp => (
        <div key={emp.id} className="bg-zinc-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-zinc-400">
              {emp.profile_photo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={emp.profile_photo} alt="" className="w-full h-full object-cover" />
                : `${emp.first_name[0]}${emp.last_name[0]}`}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</p>
              <p className="text-zinc-400 text-xs truncate">{emp.email} · {emp.mobile}</p>
              <p className="text-zinc-500 text-xs">
                {emp.gender} · DOB {new Date(emp.dob).toLocaleDateString('en-IN')} ·
                Applied {new Date(emp.created_at).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {rejectId === emp.id ? (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" onClick={() => handleReject(emp.id)} disabled={loading}>
                  Confirm Reject
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setRejectId(emp.id)}>
                  <UserX className="w-3 h-3 mr-1" /> Reject
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => openApprove(emp.id)}>
                  <UserCheck className="w-3 h-3 mr-1" /> Approve
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      <Dialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Approve — {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Employee Code *</Label>
              <Input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
                placeholder="e.g. ESAM-001" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Base Salary (₹/month) *</Label>
              <Input type="number" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))}
                placeholder="e.g. 25000" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Shift</Label>
                <Select value={form.shift_id} onValueChange={v => setForm(f => ({ ...f, shift_id: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-zinc-200">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Leave Quota / month</Label>
                <Input type="number" step="0.5" value={form.monthly_leave_quota}
                  onChange={e => setForm(f => ({ ...f, monthly_leave_quota: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setApproveId(null)} className="flex-1 border-zinc-700">Cancel</Button>
              <Button onClick={handleApprove} disabled={loading} className="flex-1">
                {loading ? 'Activating…' : 'Approve & Activate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
