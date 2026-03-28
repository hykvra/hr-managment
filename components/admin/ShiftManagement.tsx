'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Shift = { id: string; name: string; start_time: string; end_time: string }

interface Props {
  shifts: Shift[]
}

const emptyForm = { name: '', start_time: '', end_time: '' }

export function ShiftManagement({ shifts }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.start_time || !createForm.end_time) {
      setError('All fields are required'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setShowCreate(false)
      setCreateForm(emptyForm)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/shifts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setEditId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await fetch(`/api/admin/shifts/${id}`, { method: 'DELETE' })
      setDeleteId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function startEdit(s: Shift) {
    setEditId(s.id)
    setEditForm({ name: s.name, start_time: s.start_time, end_time: s.end_time })
    setError('')
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-zinc-400 text-sm">{shifts.length} shift{shifts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowCreate(true); setError('') }}>
          <Plus className="w-3 h-3" /> New Shift
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-3">
          <p className="text-zinc-300 text-xs font-medium">New Shift</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Name</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Morning" className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Start Time</Label>
              <Input type="time" value={createForm.start_time} onChange={e => setCreateForm(f => ({ ...f, start_time: e.target.value }))}
                className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">End Time</Label>
              <Input type="time" value={createForm.end_time} onChange={e => setCreateForm(f => ({ ...f, end_time: e.target.value }))}
                className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowCreate(false); setError('') }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={loading} onClick={handleCreate}>
              {loading ? 'Creating…' : 'Create Shift'}
            </Button>
          </div>
        </div>
      )}

      {/* Shift list */}
      {shifts.length === 0 && !showCreate && (
        <div className="flex items-center justify-center h-20 text-zinc-500 text-sm">No shifts yet</div>
      )}
      <div className="space-y-2">
        {shifts.map(s => (
          <div key={s.id} className="bg-zinc-800 rounded-lg p-3">
            {editId === s.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
                  <Input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                    className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
                  <Input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                    className="bg-zinc-700 border-zinc-600 text-white h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                  <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700"
                    disabled={loading} onClick={() => handleUpdate(s.id)}>
                    <Check className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{s.name}</p>
                  <p className="text-zinc-400 text-xs">{s.start_time} – {s.end_time}</p>
                </div>
                <div className="flex gap-1">
                  {deleteId === s.id ? (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteId(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700"
                        disabled={loading} onClick={() => handleDelete(s.id)}>Delete</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                        onClick={() => startEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
