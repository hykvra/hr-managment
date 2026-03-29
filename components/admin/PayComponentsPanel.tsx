'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PayComponent = {
  id: string
  component_name: string
  component_type: 'allowance' | 'deduction'
  amount: number
  is_percentage: boolean
  is_active: boolean
}

const COMMON_ALLOWANCES = ['HRA', 'Travel Allowance', 'Medical Allowance', 'Food Allowance', 'Special Allowance', 'Education Allowance']
const COMMON_DEDUCTIONS = ['Professional Tax', 'Loan Recovery', 'Canteen', 'Uniform Deduction']

interface Props {
  employeeId: string
  baseSalary: number
}

export function PayComponentsPanel({ employeeId, baseSalary }: Props) {
  const [components, setComponents] = useState<PayComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    component_name: '',
    component_type: 'allowance' as 'allowance' | 'deduction',
    amount: 0,
    is_percentage: false,
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/pay-components?employee_id=${employeeId}`)
      if (res.ok) {
        const { components: data } = await res.json()
        setComponents(data || [])
      }
    } finally { setLoading(false) }
  }, [employeeId])

  useEffect(() => { fetch_() }, [fetch_])

  function startNew(type: 'allowance' | 'deduction') {
    setEditId(null)
    setForm({ component_name: '', component_type: type, amount: 0, is_percentage: false })
    setShowForm(true)
    setError('')
  }

  function startEdit(c: PayComponent) {
    setEditId(c.id)
    setForm({ component_name: c.component_name, component_type: c.component_type, amount: c.amount, is_percentage: c.is_percentage })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.component_name.trim()) { setError('Name is required'); return }
    if (form.amount <= 0) { setError('Amount must be greater than 0'); return }
    setSaving(true); setError('')
    try {
      const url = editId ? `/api/admin/pay-components/${editId}` : '/api/admin/pay-components'
      const method = editId ? 'PATCH' : 'POST'
      const body = editId
        ? { component_name: form.component_name, amount: form.amount, is_percentage: form.is_percentage }
        : { employee_id: employeeId, ...form }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setShowForm(false); setEditId(null)
      await fetch_()
    } finally { setSaving(false) }
  }

  async function handleToggle(c: PayComponent) {
    await fetch(`/api/admin/pay-components/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    await fetch_()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pay component?')) return
    await fetch(`/api/admin/pay-components/${id}`, { method: 'DELETE' })
    await fetch_()
  }

  function resolveAmt(c: PayComponent) {
    return c.is_percentage ? (baseSalary * c.amount / 100) : c.amount
  }

  const allowances = components.filter(c => c.component_type === 'allowance')
  const deductions = components.filter(c => c.component_type === 'deduction')
  const totalAllowances = allowances.filter(c => c.is_active).reduce((s, c) => s + resolveAmt(c), 0)
  const totalDeductions = deductions.filter(c => c.is_active).reduce((s, c) => s + resolveAmt(c), 0)

  if (loading) return <div className="text-zinc-500 text-xs py-2">Loading components…</div>

  return (
    <div className="space-y-3">
      {/* Summary */}
      {components.length > 0 && (
        <div className="flex gap-2">
          <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <p className="text-zinc-500 text-[10px]">Total Allowances</p>
            <p className="text-green-400 font-bold text-sm">+₹{Math.round(totalAllowances).toLocaleString('en-IN')}</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-zinc-500 text-[10px]">Total Deductions</p>
            <p className="text-red-400 font-bold text-sm">−₹{Math.round(totalDeductions).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
          <p className="text-white text-xs font-medium">{editId ? 'Edit Component' : `New ${form.component_type === 'allowance' ? 'Allowance' : 'Deduction'}`}</p>

          {/* Quick presets */}
          {!editId && (
            <div className="flex flex-wrap gap-1">
              {(form.component_type === 'allowance' ? COMMON_ALLOWANCES : COMMON_DEDUCTIONS).map(name => (
                <button key={name} onClick={() => setForm(f => ({ ...f, component_name: name }))}
                  className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded hover:text-white hover:bg-zinc-700 transition-colors">
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs">Name *</Label>
              <Input value={form.component_name} onChange={e => setForm(f => ({ ...f, component_name: e.target.value }))}
                placeholder="e.g. HRA" className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs">Amount {form.is_percentage ? '(% of basic)' : '(₹/month)'}</Label>
              <Input type="number" min={0} value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_percentage}
              onChange={e => setForm(f => ({ ...f, is_percentage: e.target.checked }))}
              className="w-3.5 h-3.5 accent-blue-500" />
            <span className="text-zinc-400 text-xs">
              Percentage of basic salary
              {form.is_percentage && form.amount > 0 && (
                <span className="text-zinc-300 ml-1">(= ₹{Math.round(baseSalary * form.amount / 100).toLocaleString('en-IN')})</span>
              )}
            </span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" disabled={saving} onClick={handleSave}>
              <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 gap-1"
              onClick={() => { setShowForm(false); setEditId(null) }}>
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Allowances */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-zinc-400 text-xs font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" /> Allowances
          </p>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-400 gap-1 px-2"
            onClick={() => startNew('allowance')}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {allowances.length === 0 ? (
          <p className="text-zinc-600 text-xs">No allowances added</p>
        ) : (
          <div className="space-y-1">
            {allowances.map(c => (
              <div key={c.id} className={`flex items-center gap-2 py-1 ${!c.is_active ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <span className="text-zinc-300 text-xs">{c.component_name}</span>
                  <span className="text-zinc-500 text-[10px] ml-1.5">
                    {c.is_percentage ? `${c.amount}% = ₹${Math.round(resolveAmt(c)).toLocaleString('en-IN')}` : `₹${Math.round(c.amount).toLocaleString('en-IN')}`}
                  </span>
                </div>
                <button onClick={() => handleToggle(c)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${c.is_active ? 'text-green-400 border-green-500/30' : 'text-zinc-500 border-zinc-600'}`}>
                  {c.is_active ? 'On' : 'Off'}
                </button>
                <button onClick={() => startEdit(c)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deductions */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-zinc-400 text-xs font-medium flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" /> Deductions
          </p>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 gap-1 px-2"
            onClick={() => startNew('deduction')}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {deductions.length === 0 ? (
          <p className="text-zinc-600 text-xs">No deductions added</p>
        ) : (
          <div className="space-y-1">
            {deductions.map(c => (
              <div key={c.id} className={`flex items-center gap-2 py-1 ${!c.is_active ? 'opacity-40' : ''}`}>
                <div className="flex-1">
                  <span className="text-zinc-300 text-xs">{c.component_name}</span>
                  <span className="text-zinc-500 text-[10px] ml-1.5">
                    {c.is_percentage ? `${c.amount}% = ₹${Math.round(resolveAmt(c)).toLocaleString('en-IN')}` : `₹${Math.round(c.amount).toLocaleString('en-IN')}`}
                  </span>
                </div>
                <button onClick={() => handleToggle(c)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${c.is_active ? 'text-green-400 border-green-500/30' : 'text-zinc-500 border-zinc-600'}`}>
                  {c.is_active ? 'On' : 'Off'}
                </button>
                <button onClick={() => startEdit(c)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
