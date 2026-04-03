'use client'

import Image from 'next/image'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Gift, RefreshCw, UserX, ChevronDown, X, Settings, FolderOpen, ExternalLink, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PayComponentsPanel } from './PayComponentsPanel'

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
  department: string | null
  employment_type: string
  pf_enabled: boolean
  esi_enabled: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shifts: any
}

type Shift = { id: string; name: string }
type Department = { id: string; name: string }

type ModalType = 'salary' | 'bonus' | 'shift' | 'deactivate' | 'edit_details' | 'add_employee' | null

type DocItem = {
  id: string
  doc_type: string
  doc_name: string
  file_url: string
  file_size: number | null
  uploaded_at: string
}

const DOC_ICON: Record<string, string> = {
  aadhaar: '🪪', pan: '💳', passport: '🛂', offer_letter: '📄',
  experience: '📋', certificate: '🎓', other: '📎',
}

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
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Modal state
  const [modal, setModal] = useState<ModalType>(null)

  // Per-employee documents (lazy-loaded on expand)
  const [empDocs, setEmpDocs] = useState<Record<string, DocItem[]>>({})
  const [docsLoading, setDocsLoading] = useState<Record<string, boolean>>({})

  const loadDocs = useCallback(async (empId: string) => {
    if (empDocs[empId] !== undefined) return
    setDocsLoading(prev => ({ ...prev, [empId]: true }))
    try {
      const res = await fetch(`/api/admin/employees/${empId}/documents`)
      if (res.ok) {
        const { documents } = await res.json()
        setEmpDocs(prev => ({ ...prev, [empId]: documents || [] }))
      }
    } finally {
      setDocsLoading(prev => ({ ...prev, [empId]: false }))
    }
  }, [empDocs])
  const [selected, setSelected] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  // Form fields
  const [empDept, setEmpDept] = useState('')
  const [empType, setEmpType] = useState('regular')
  const [pfEnabled, setPfEnabled] = useState(false)
  const [esiEnabled, setEsiEnabled] = useState(false)

  const [newSalary, setNewSalary] = useState('')
  const [salaryMessage, setSalaryMessage] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [newShiftId, setNewShiftId] = useState('')

  // Add employee form
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newDob, setNewDob] = useState('')
  const [newGender, setNewGender] = useState('Male')
  const [newJoining, setNewJoining] = useState(new Date().toISOString().slice(0, 10))
  const [newSalaryAmt, setNewSalaryAmt] = useState('0')
  const [newEmpCode, setNewEmpCode] = useState('')
  const [newRole, setNewRole] = useState('employee')
  const [newShift, setNewShift] = useState('')
  const [newDept, setNewDept] = useState('')

  async function fetchEmployees() {
    setLoading(true)
    try {
      const [empRes, shiftRes, deptRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/shifts'),
        fetch('/api/admin/departments'),
      ])
      if (empRes.ok) {
        const { employees: data } = await empRes.json() as { employees: Employee[] }
        setEmployees(data)
      }
      if (shiftRes.ok) {
        const { shifts: data } = await shiftRes.json() as { shifts: Shift[] }
        setShifts(data)
      }
      if (deptRes.ok) {
        const { departments: data } = await deptRes.json() as { departments: Department[] }
        setDepartments(data)
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
    setEmpDept(emp.department || '')
    setEmpType(emp.employment_type || 'regular')
    setPfEnabled(emp.pf_enabled || false)
    setEsiEnabled(emp.esi_enabled || false)
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setApiError('')
  }

  async function submitNewEmployee() {
    setSubmitting(true)
    setApiError('')
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: newFirst, last_name: newLast, email: newEmail,
          mobile: newMobile, address: newAddress, dob: newDob,
          gender: newGender, joining_date: newJoining,
          base_salary: Number(newSalaryAmt), employee_code: newEmpCode,
          role: newRole, shift_id: newShift || null, department: newDept || null,
        }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) { setApiError(json.error || 'Something went wrong'); return }
      // Reset form
      setNewFirst(''); setNewLast(''); setNewEmail(''); setNewMobile('')
      setNewAddress(''); setNewDob(''); setNewGender('Male')
      setNewJoining(new Date().toISOString().slice(0, 10))
      setNewSalaryAmt('0'); setNewEmpCode(''); setNewRole('employee')
      setNewShift(''); setNewDept('')
      setModal(null)
      await fetchEmployees()
    } finally {
      setSubmitting(false)
    }
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
        <Button size="sm"
          className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1.5"
          onClick={() => { setModal('add_employee'); setApiError('') }}>
          <UserPlus className="w-3.5 h-3.5" /> Add Employee
        </Button>
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
                    ? <Image src={emp.profile_photo} alt="" width={32} height={32} className="w-full h-full rounded-full object-cover" />
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
                    onClick={() => {
                      const next = isExpanded ? null : emp.id
                      setExpanded(next)
                      if (next) loadDocs(next)
                    }}>
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
                    {emp.department && <div><p className="text-zinc-500 text-[10px]">Department</p><p className="text-zinc-300">{emp.department}</p></div>}
                    <div><p className="text-zinc-500 text-[10px]">Type</p><p className="text-zinc-300 capitalize">{emp.employment_type || 'Regular'}</p></div>
                    <div className="flex gap-2">
                      {emp.pf_enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">PF</span>}
                      {emp.esi_enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">ESI</span>}
                    </div>
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
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white gap-1"
                      onClick={() => openModal('edit_details', emp)}>
                      <Settings className="w-3 h-3" /> Details
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-zinc-700 text-red-400 hover:text-red-300 gap-1"
                      onClick={() => openModal('deactivate', emp)}>
                      <UserX className="w-3 h-3" /> Deactivate
                    </Button>
                  </div>
                  <div className="mt-3 border-t border-zinc-700/50 pt-3">
                    <p className="text-zinc-400 text-xs font-medium mb-2">Pay Components</p>
                    <PayComponentsPanel employeeId={emp.id} baseSalary={emp.base_salary} />
                  </div>

                  {/* Documents */}
                  <div className="mt-3 border-t border-zinc-700/50 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                      <p className="text-zinc-400 text-xs font-medium">Documents</p>
                    </div>
                    {docsLoading[emp.id] ? (
                      <p className="text-zinc-600 text-xs py-1">Loading…</p>
                    ) : !empDocs[emp.id] || empDocs[emp.id].length === 0 ? (
                      <p className="text-zinc-600 text-xs">No documents uploaded</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {empDocs[emp.id].map(doc => (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md px-2.5 py-1.5 transition-colors group"
                          >
                            <span className="text-sm">{DOC_ICON[doc.doc_type] || '📎'}</span>
                            <span className="text-[11px] text-zinc-300 group-hover:text-white">
                              {doc.doc_name || doc.doc_type.replace(/_/g, ' ')}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-600 group-hover:text-zinc-400" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modals ── */}
      {modal && (modal === 'add_employee' || selected) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-white font-semibold text-sm">
                  {modal === 'salary' ? 'Update Salary' :
                   modal === 'bonus' ? 'Add Bonus' :
                   modal === 'shift' ? 'Change Shift' :
                   modal === 'edit_details' ? 'Edit Details' :
                   modal === 'add_employee' ? 'Add New Employee' : 'Deactivate Employee'}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {modal === 'add_employee' ? 'Fill in the details below' : `${selected?.first_name} ${selected?.last_name}`}
                </p>
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
                      ₹{Number(selected?.base_salary).toLocaleString('en-IN')}
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
                    <p className="text-zinc-300 text-sm">{shiftName(selected?.shift_id ?? null)}</p>
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

              {/* Edit details modal */}
              {modal === 'edit_details' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Department</Label>
                    {departments.length > 0 ? (
                      <select value={empDept} onChange={e => setEmpDept(e.target.value)}
                        className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">No department</option>
                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    ) : (
                      <Input value={empDept} onChange={e => setEmpDept(e.target.value)}
                        placeholder="e.g. Engineering, Sales, HR"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Employment Type</Label>
                    <select value={empType} onChange={e => setEmpType(e.target.value)}
                      className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2">
                      <option value="regular">Regular (Threshold-based salary)</option>
                      <option value="contractual">Contractual (Fixed monthly)</option>
                      <option value="daily_wage">Daily Wage (Actual days × rate)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={pfEnabled} onChange={e => setPfEnabled(e.target.checked)}
                        className="w-4 h-4 accent-blue-500" />
                      <span className="text-zinc-300 text-xs">PF (12% of basic)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={esiEnabled} onChange={e => setEsiEnabled(e.target.checked)}
                        className="w-4 h-4 accent-purple-500" />
                      <span className="text-zinc-300 text-xs">ESI (if gross ≤ ₹21K)</span>
                    </label>
                  </div>
                  <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                    onClick={() => submit('edit_details', { department: empDept, employment_type: empType, pf_enabled: pfEnabled, esi_enabled: esiEnabled })}>
                    {submitting ? 'Saving…' : 'Save Details'}
                  </Button>
                </>
              )}

              {/* Deactivate modal */}
              {modal === 'deactivate' && (
                <>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-xs font-medium">Are you sure?</p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {selected?.first_name} {selected?.last_name} will lose access to the portal immediately.
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

              {/* Add employee modal */}
              {modal === 'add_employee' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">First Name *</Label>
                      <Input value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Aman"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Last Name *</Label>
                      <Input value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Khan"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Email *</Label>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="aman@example.com" type="email"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Mobile *</Label>
                      <Input value={newMobile} onChange={e => setNewMobile(e.target.value)} placeholder="9876543210"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Employee Code</Label>
                      <Input value={newEmpCode} onChange={e => setNewEmpCode(e.target.value)} placeholder="e.g. 7"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Address *</Label>
                    <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Street, City"
                      className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Date of Birth *</Label>
                      <Input value={newDob} onChange={e => setNewDob(e.target.value)} type="date"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Gender *</Label>
                      <select value={newGender} onChange={e => setNewGender(e.target.value)}
                        className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Joining Date *</Label>
                      <Input value={newJoining} onChange={e => setNewJoining(e.target.value)} type="date"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Base Salary (₹)</Label>
                      <Input value={newSalaryAmt} onChange={e => setNewSalaryAmt(e.target.value)} type="number" placeholder="0"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Role</Label>
                      <select value={newRole} onChange={e => setNewRole(e.target.value)}
                        className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2">
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="attendance">Attendance</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Shift</Label>
                      <select value={newShift} onChange={e => setNewShift(e.target.value)}
                        className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2">
                        <option value="">No shift</option>
                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {departments.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Department</Label>
                      <select value={newDept} onChange={e => setNewDept(e.target.value)}
                        className="w-full h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2">
                        <option value="">No department</option>
                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                  <p className="text-zinc-600 text-[10px]">Default password: Esam@1234 (employee changes on first login)</p>
                  <Button className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    disabled={submitting || !newFirst || !newLast || !newEmail || !newMobile || !newAddress || !newDob || !newJoining}
                    onClick={submitNewEmployee}>
                    {submitting ? 'Creating…' : 'Create Employee'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
