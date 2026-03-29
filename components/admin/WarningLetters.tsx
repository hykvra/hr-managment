'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Printer, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Warning = {
  id: string
  warning_type: string
  subject: string
  description: string
  issued_on: string
  acknowledged_at: string | null
  employees: { first_name: string; last_name: string; employee_code: string | null }
  issuer: { first_name: string; last_name: string } | null
}

type Employee = { id: string; first_name: string; last_name: string; employee_code: string | null }

const TYPE_CLS: Record<string, string> = {
  verbal:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  written: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  final:   'bg-red-500/10 text-red-400 border-red-500/20',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function printWarning(w: Warning, companyName: string) {
  const html = `<!DOCTYPE html><html><head><title>Warning Letter</title>
<style>
@page{size:A4;margin:20mm}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:12px;color:#111;line-height:1.6}
.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:20px}
.hdr h1{font-size:20px;font-weight:bold}.hdr h2{font-size:13px;color:#555;margin-top:3px}
.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:bold;
  background:${w.warning_type==='final'?'#fee2e2':w.warning_type==='written'?'#ffedd5':'#fef9c3'};
  color:${w.warning_type==='final'?'#991b1b':w.warning_type==='written'?'#9a3412':'#854d0e'};margin-bottom:16px}
.field{margin-bottom:10px}.lbl{font-size:10px;color:#888;margin-bottom:2px}.val{font-size:12px;color:#111}
.desc{background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:4px;margin:12px 0;white-space:pre-wrap}
.sigs{display:flex;justify-content:space-between;margin-top:40px}
.sl{border-top:1px solid #000;width:140px;margin:0 auto 4px}.sg{font-size:10px;color:#555;text-align:center}
</style></head><body>
<div class="hdr"><h1>${companyName}</h1><h2>WARNING LETTER — ${w.warning_type.toUpperCase()}</h2></div>
<div class="badge">${w.warning_type.toUpperCase()} WARNING</div>
<div class="field"><div class="lbl">Employee</div><div class="val">${w.employees.first_name} ${w.employees.last_name}${w.employees.employee_code ? ` (${w.employees.employee_code})` : ''}</div></div>
<div class="field"><div class="lbl">Date Issued</div><div class="val">${fmtDate(w.issued_on)}</div></div>
<div class="field"><div class="lbl">Subject</div><div class="val"><strong>${w.subject}</strong></div></div>
<div class="field"><div class="lbl">Details</div><div class="desc">${w.description}</div></div>
<p style="font-size:11px;color:#555;margin-top:12px">This letter serves as an official record. Please acknowledge receipt and sign below.</p>
<div class="sigs">
  <div><div class="sl"></div><div class="sg">Issued By — ${w.issuer ? `${w.issuer.first_name} ${w.issuer.last_name}` : 'Manager'}</div></div>
  <div><div class="sl"></div><div class="sg">Employee Acknowledgement</div></div>
</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url) } }
  else URL.revokeObjectURL(url)
}

export function WarningLetters() {
  const [warnings, setWarnings]   = useState<Warning[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const empFetched = useRef(false)

  const [form, setForm] = useState({
    employee_id: '', warning_type: 'written', subject: '', description: '',
    issued_on: new Date().toISOString().slice(0, 10),
  })

  const fetchWarnings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/warnings')
      if (res.ok) {
        const { warnings: data } = await res.json()
        setWarnings(data || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchWarnings() }, [fetchWarnings])

  useEffect(() => {
    if (empFetched.current) return
    empFetched.current = true
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .catch(() => {})
  }, [])

  async function handleCreate() {
    if (!form.employee_id) { setError('Select an employee'); return }
    if (!form.subject.trim()) { setError('Subject is required'); return }
    if (!form.description.trim()) { setError('Description is required'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/admin/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setShowForm(false)
      setForm({ employee_id: '', warning_type: 'written', subject: '', description: '', issued_on: new Date().toISOString().slice(0, 10) })
      await fetchWarnings()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/admin/warnings/${id}`, { method: 'DELETE' })
      await fetchWarnings()
    } finally { setDeletingId(null) }
  }

  // Best-effort company name from branding (fallback)
  const companyName = typeof window !== 'undefined'
    ? (document.title?.split('|')[0]?.trim() || 'Company') : 'Company'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-xs">{warnings.length} warning letter{warnings.length !== 1 ? 's' : ''}</p>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
          onClick={() => { setShowForm(s => !s); setError('') }}
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'Cancel' : 'Issue Warning'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <p className="text-zinc-300 text-xs font-semibold">Issue Warning Letter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Employee *</label>
              <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.employee_code ? ` #${e.employee_code}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Warning Type *</label>
              <select value={form.warning_type} onChange={e => setForm(f => ({ ...f, warning_type: e.target.value }))}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="verbal">Verbal Warning</option>
                <option value="written">Written Warning</option>
                <option value="final">Final Warning</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-zinc-500 text-[10px]">Subject *</label>
              <Input placeholder="e.g. Repeated tardiness, policy violation"
                value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-zinc-500 text-[10px]">Description *</label>
              <textarea
                rows={3}
                placeholder="Describe the incident and expected corrective action…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Issued On</label>
              <Input type="date" value={form.issued_on}
                onChange={e => setForm(f => ({ ...f, issued_on: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700"
            onClick={handleCreate} disabled={submitting}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? 'Issuing…' : 'Issue Warning Letter'}
          </Button>
        </div>
      )}

      {loading && <div className="text-zinc-500 text-xs py-4 text-center">Loading…</div>}
      {!loading && warnings.length === 0 && (
        <div className="text-zinc-500 text-sm py-8 text-center">No warning letters issued</div>
      )}

      {!loading && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map(w => (
            <div key={w.id} className="bg-zinc-800 rounded-lg p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">
                      {w.employees.first_name} {w.employees.last_name}
                    </span>
                    {w.employees.employee_code && (
                      <span className="text-zinc-500 text-[10px] font-mono">#{w.employees.employee_code}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_CLS[w.warning_type]}`}>
                      {w.warning_type}
                    </span>
                  </div>
                  <p className="text-zinc-200 text-xs font-medium mt-0.5">{w.subject}</p>
                  <p className="text-zinc-500 text-[10px]">
                    {fmtDate(w.issued_on)}
                    {w.issuer && ` · by ${w.issuer.first_name} ${w.issuer.last_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-blue-400"
                    onClick={() => printWarning(w, companyName)}
                    title="Print">
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                    disabled={deletingId === w.id}
                    onClick={() => handleDelete(w.id)}
                    title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
