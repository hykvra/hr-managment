'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Gift, RefreshCw, UserX, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_code: string | null
  mobile: string
  role: string
  shift_id: string | null
  base_salary: number
  leave_balance: number
  joining_date: string
  profile_photo: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shifts: any
}

type Shift = { id: string; name: string }

type ModalType = 'salary' | 'bonus' | 'shift' | 'deactivate' | null

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function fmt(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function EmployeeManagement() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Modal state
  const [modal, setModal] = useState<ModalType>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  // Form fields
  const [newSalary, setNewSalary] = useState('')
  const [salaryMessage, setSalaryMessage] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [newShiftId, setNewShiftId] = useState('')

  async function fetchEmployees() {
    setLoading(true)
    try {
      const [empRes, shiftRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/shifts'),
      ])
      if (empRes.ok) {
        const { employees: data } = await empRes.json() as { employees: Employee[] }
        setEmployees(data)
      }
      if (shiftRes.ok) {
        const { shifts: data } = await shiftRes.json() as { shifts: Shift[] }
        setShifts(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const term = search.toLowerCase()
      const matchSearch = !term ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
        (e.employee_code?.toLowerCase() || '').includes(term) ||
        e.email.toLowerCase().includes(term)
      const matchShift = shiftFilter === 'all' || e.shift_id === shiftFilter
      return matchSearch && matchShift
    })
  }, [employees, search, shiftFilter])

  function openModal(type: ModalType, emp: Employee) {
    setModal(type)
    setSelected(emp)
    setApiError('')
    // Pre-fill
    setNewSalary(String(emp.base_salary))
    setSalaryMessage('')
    setBonusAmount('')
    setBonusReason('')
    setNewShiftId(emp.shift_id || '')
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setApiError('')
  }

  async function submit(action: string, body: Record<string, unknown>) {
    if (!selected) return
    setSubmitting(true)
    setApiError('')
    try {
      const res = await fetch(`/api/admin/employees/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) { setApiError(json.error || 'Something went wrong'); return }
      closeModal()
      await fetchEmployees()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  function shiftName(shiftId: string | null) {
    if (!shiftId) return 'Unassigned'
    return shifts.find(s => s.id === shiftId)?.name || 'Unknown'
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search by name, code or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="h-8 w-36 text-xs bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="All shifts" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
            <SelectItem value="all" className="text-xs">All Shifts</SelectItem>
            {shifts.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-zinc-500 text-xs ml-auto">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">Loading…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
          {search ? 'No employees match your search' : 'No active employees'}
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-2">
        {filtered.map(emp => {
          const isExpanded = expanded === emp.id
          const shift = shiftName(emp.shift_id)
          return (
            <div key={emp.id} className="bg-zinc-800 rounded-lg overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 font-bold text-xs">
                  {emp.profile_photo
                    ? <img src={emp.profile_photo} alt="" className="w-full h-full rounded-full object-cover" />
                    : `${emp.first_name[0]}${emp.last_name[0]}`}
                </div>

                {/* Name & info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {emp.first_name} {emp.last_name}
                    </span>
                    {emp.employee_code && (
                      <span className="text-zinc-500 text-[10px] font-mono">#{emp.employee_code}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      emp.role === 'manager' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>{emp.role}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-zinc-500 text-[10px]">{shift}</span>
                    <span className="text-zinc-400 text-[10px] font-medium">₹{Number(emp.base_salary).toLocaleString('en-IN')}/mo</span>
                    <span className="text-zinc-600 text-[10px]">{emp.leave_balance} leaves left</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline"
                    className="h-6 text-[10px] px-2 border-zinc-700 text-green-400 hover:text-green-300 gap-1 hidden sm:flex"
                    onClick={() => openModal('salary', emp)}>
                    <TrendingUp className="w-3 h-3" /> Salary
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-6 text-[10px] px-2 border-zinc-700 text-yellow-400 hover:text-yellow-300 gap-1 hidden sm:flex"
                    onClick={() => openModal('bonus', emp)}>
                    <Gift className="w-3 h-3" /> Bonus
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-6 w-6 p-0 text-zinc-400"
                    onClick={() => setExpanded(isExpanded ? null : emp.id)}>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-zinc-700/50 px-3 py-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div><p className="text-zinc-500 text-[10px]">Email</p><p className="text-zinc-300 truncate">{emp.email}</p></div>
                    <div><p className="text-zinc-500 text-[10px]">Mobile</p><p className="text-zinc-300">{emp.mobile}</p></div>
                    <div><p className="text-zinc-500 text-[10px]">Joined</p><p className="text-zinc-300">{fmt(emp.joining_date)}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-zinc-700 text-green-400 hover:text-green-300 gap-1"
                      onClick={() => openModal('salary', emp)}>
                      <TrendingUp className="w-3 h-3" /> Update Salary
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-zinc-700 text-yellow-400 hover:text-yellow-300 gap-1"
                      onClick={() => openModal('bonus', emp)}>
                      <Gift className="w-3 h-3" /> Add Bonus
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-zinc-700 text-blue-400 hover:text-blue-300 gap-1"
                      onClick={() => openModal('shift', emp)}>
                      <RefreshCw className="w-3 h-3" /> Change Shift
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-zinc-700 text-red-400 hover:text-red-300 gap-1"
                      onClick={() => openModal('deactivate', emp)}>
                      <UserX className="w-3 h-3" /> Deactivate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modals ── */}
      {modal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-white font-semibold text-sm">
                  {modal === 'salary' ? 'Update Salary' :
                   modal === 'bonus' ? 'Add Bonus' :
                   modal === 'shift' ? 'Change Shift' : 'Deactivate Employee'}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{selected.first_name} {selected.last_name}</p>
              </div>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {apiError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                  {apiError}
                </p>
              )}

              {/* Salary modal */}
              {modal === 'salary' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Current Salary</Label>
                    <p className="text-zinc-300 text-sm font-medium">
                      ₹{Number(selected.base_salary).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">New Salary (₹) *</Label>
                    <Input value={newSalary} onChange={e => setNewSalary(e.target.value)}
                      type="number" placeholder="e.g. 35000"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Message to Employee (optional)</Label>
                    <Input value={salaryMessage} onChange={e => setSalaryMessage(e.target.value)}
                      placeholder="e.g. Annual increment — great performance"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <Button className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                    disabled={submitting || !newSalary}
                    onClick={() => submit('salary_update', { new_salary: newSalary, message: salaryMessage })}>
                    {submitting ? 'Saving…' : 'Update Salary'}
                  </Button>
                </>
              )}

              {/* Bonus modal */}
              {modal === 'bonus' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Bonus Amount (₹) *</Label>
                    <Input value={bonusAmount} onChange={e => setBonusAmount(e.target.value)}
                      type="number" placeholder="e.g. 5000"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Reason *</Label>
                    <Input value={bonusReason} onChange={e => setBonusReason(e.target.value)}
                      placeholder="e.g. Diwali bonus, project completion"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <Button className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700"
                    disabled={submitting || !bonusAmount || !bonusReason}
                    onClick={() => submit('add_bonus', { amount: bonusAmount, reason: bonusReason })}>
                    {submitting ? 'Saving…' : 'Add Bonus'}
                  </Button>
                </>
              )}

              {/* Shift modal */}
              {modal === 'shift' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Current Shift</Label>
                    <p className="text-zinc-300 text-sm">{shiftName(selected.shift_id)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">New Shift</Label>
                    <Select value={newShiftId} onValueChange={setNewShiftId}>
                      <SelectTrigger className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="none" className="text-xs">No shift assigned</SelectItem>
                        {shifts.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                    onClick={() => submit('shift_change', { shift_id: newShiftId === 'none' ? null : newShiftId })}>
                    {submitting ? 'Saving…' : 'Change Shift'}
                  </Button>
                </>
              )}

              {/* Deactivate modal */}
              {modal === 'deactivate' && (
                <>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-xs font-medium">Are you sure?</p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {selected.first_name} {selected.last_name} will lose access to the portal immediately.
                      This can be reversed by reactivating from the employee list.
                    </p>
                  </div>
                  <Button className="w-full h-8 text-xs bg-red-600 hover:bg-red-700"
                    disabled={submitting}
                    onClick={() => submit('deactivate', {})}>
                    {submitting ? 'Deactivating…' : 'Yes, Deactivate'}
                  </Button>
                  <Button variant="outline" className="w-full h-8 text-xs border-zinc-700"
                    onClick={closeModal}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
