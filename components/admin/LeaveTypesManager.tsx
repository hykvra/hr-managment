'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LeaveType = {
  id: string
  name: string
  annual_quota: number
  carry_forward_enabled: boolean
  max_carry_forward: number
  color: string
  is_active: boolean
}

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

const DEFAULT_TYPES = [
  { name: 'Sick Leave',    annual_quota: 12, carry_forward_enabled: false, max_carry_forward: 0, color: '#ef4444' },
  { name: 'Casual Leave',  annual_quota: 12, carry_forward_enabled: false, max_carry_forward: 0, color: '#f59e0b' },
  { name: 'Earned Leave',  annual_quota: 15, carry_forward_enabled: true,  max_carry_forward: 15, color: '#10b981' },
  { name: 'Vacation',      annual_quota: 10, carry_forward_enabled: false, max_carry_forward: 0, color: '#3b82f6' },
]

export function LeaveTypesManager() {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [seeding, setSeeding] = useState(false)

  const [form, setForm] = useState({
    name: '', annual_quota: 12, carry_forward_enabled: false, max_carry_forward: 0, color: '#6366f1',
  })

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leave-types')
      if (res.ok) {
        const { leave_types } = await res.json()
        setTypes(leave_types || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  function startEdit(lt: LeaveType) {
    setEditId(lt.id)
    setForm({ name: lt.name, annual_quota: lt.annual_quota, carry_forward_enabled: lt.carry_forward_enabled, max_carry_forward: lt.max_carry_forward, color: lt.color })
    setShowForm(true)
    setError('')
  }

  function startNew() {
    setEditId(null)
    setForm({ name: '', annual_quota: 12, carry_forward_enabled: false, max_carry_forward: 0, color: '#6366f1' })
    setShowForm(true)
    setError('')
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const url = editId ? `/api/admin/leave-types/${editId}` : '/api/admin/leave-types'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setShowForm(false)
      setEditId(null)
      await fetchTypes()
    } finally { setSaving(false) }
  }

  async function handleToggleActive(lt: LeaveType) {
    await fetch(`/api/admin/leave-types/${lt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !lt.is_active }),
    })
    await fetchTypes()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this leave type? This cannot be undone.')) return
    const res = await fetch(`/api/admin/leave-types/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || 'Failed to delete')
      return
    }
    await fetchTypes()
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      for (const t of DEFAULT_TYPES) {
        await fetch('/api/admin/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t),
        })
      }
      await fetchTypes()
    } finally { setSeeding(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-16 text-zinc-500 text-xs">Loading leave types…</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-zinc-300 text-xs font-medium">Leave Types ({types.length})</p>
        <div className="flex gap-2">
          {types.length === 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-600 text-zinc-300" disabled={seeding} onClick={seedDefaults}>
              {seeding ? 'Adding…' : 'Add Defaults'}
            </Button>
          )}
          <Button size="sm" className="h-7 text-xs gap-1" onClick={startNew}>
            <Plus className="w-3 h-3" /> Add Type
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
          <p className="text-white text-xs font-medium">{editId ? 'Edit Leave Type' : 'New Leave Type'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sick Leave" className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Annual Quota (days)</Label>
              <Input type="number" value={form.annual_quota} min={0} step={0.5}
                onChange={e => setForm(f => ({ ...f, annual_quota: Number(e.target.value) }))}
                className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-400 text-xs">Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" title="Custom colour" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.carry_forward_enabled}
                onChange={e => setForm(f => ({ ...f, carry_forward_enabled: e.target.checked }))}
                className="w-3.5 h-3.5 accent-blue-500" />
              <span className="text-zinc-300 text-xs">Allow carry forward</span>
            </label>
            {form.carry_forward_enabled && (
              <div className="flex items-center gap-2">
                <Label className="text-zinc-400 text-xs whitespace-nowrap">Max days</Label>
                <Input type="number" value={form.max_carry_forward} min={0} step={1}
                  onChange={e => setForm(f => ({ ...f, max_carry_forward: Number(e.target.value) }))}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs w-16" />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" disabled={saving} onClick={handleSave}>
              <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 gap-1" onClick={cancelForm}>
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {types.length === 0 && !showForm && (
        <div className="bg-zinc-800 rounded-lg px-4 py-6 text-center">
          <p className="text-zinc-500 text-sm">No leave types yet</p>
          <p className="text-zinc-600 text-xs mt-1">Add defaults (Sick, Casual, Earned, Vacation) or create custom types</p>
        </div>
      )}
      {types.length > 0 && (
        <div className="bg-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-700/50">
          {types.map(lt => (
            <div key={lt.id} className={`flex items-center gap-3 px-4 py-3 ${!lt.is_active ? 'opacity-50' : ''}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium">{lt.name}</p>
                <p className="text-zinc-500 text-[10px]">
                  {lt.annual_quota} days/yr
                  {lt.carry_forward_enabled && ` · carry forward up to ${lt.max_carry_forward} days`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleToggleActive(lt)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium transition-colors ${lt.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'}`}>
                  {lt.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => startEdit(lt)} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(lt.id)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
