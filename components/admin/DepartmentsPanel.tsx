'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Department = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export function DepartmentsPanel() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchDepts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/departments')
      if (res.ok) {
        const { departments: data } = await res.json()
        setDepartments(data || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDepts() }, [fetchDepts])

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setName(''); setDescription(''); setShowForm(false)
      await fetchDepts()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' })
      await fetchDepts()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-xs">{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
          onClick={() => { setShowForm(s => !s); setError('') }}
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'Cancel' : 'Add Department'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Department Name *</label>
              <Input
                placeholder="e.g. Operations"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-500 text-[10px]">Description (optional)</label>
              <Input
                placeholder="Short description…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save Department'}
          </Button>
        </div>
      )}

      {/* List */}
      {loading && <div className="text-zinc-500 text-xs py-4 text-center">Loading…</div>}
      {!loading && departments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-600 gap-2">
          <Building2 className="w-8 h-8" />
          <p className="text-sm">No departments yet</p>
        </div>
      )}
      {!loading && departments.length > 0 && (
        <div className="space-y-1.5">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5 gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-zinc-200 text-sm font-medium">{dept.name}</p>
                {dept.description && (
                  <p className="text-zinc-500 text-xs truncate">{dept.description}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 shrink-0"
                disabled={deletingId === dept.id}
                onClick={() => handleDelete(dept.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
