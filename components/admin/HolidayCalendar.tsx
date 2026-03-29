'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Holiday = { id: string; name: string; date: string }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

// Some common Indian public holidays to prefill quickly
const COMMON_HOLIDAYS = [
  { name: 'Republic Day',     date: `${new Date().getFullYear()}-01-26` },
  { name: 'Holi',             date: `${new Date().getFullYear()}-03-14` },
  { name: 'Good Friday',      date: `${new Date().getFullYear()}-04-18` },
  { name: 'Ambedkar Jayanti', date: `${new Date().getFullYear()}-04-14` },
  { name: 'Labour Day',       date: `${new Date().getFullYear()}-05-01` },
  { name: 'Independence Day', date: `${new Date().getFullYear()}-08-15` },
  { name: 'Gandhi Jayanti',   date: `${new Date().getFullYear()}-10-02` },
  { name: 'Dussehra',         date: `${new Date().getFullYear()}-10-02` },
  { name: 'Diwali',           date: `${new Date().getFullYear()}-10-20` },
  { name: 'Christmas',        date: `${new Date().getFullYear()}-12-25` },
]

export function HolidayCalendar() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showQuick, setShowQuick] = useState(false)

  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/holidays')
      if (res.ok) {
        const { holidays: data } = await res.json()
        setHolidays(data || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  async function handleAdd() {
    if (!name.trim() || !date) { setError('Name and date are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), date }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to add'); return }
      setName(''); setDate('')
      await fetchHolidays()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this holiday?')) return
    await fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' })
    await fetchHolidays()
  }

  async function addQuick(h: { name: string; date: string }) {
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(h),
    })
    if (res.ok) await fetchHolidays()
  }

  if (loading) return <div className="flex items-center justify-center h-16 text-zinc-500 text-xs">Loading holidays…</div>

  const existingDates = new Set(holidays.map(h => h.date))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-zinc-300 text-xs font-medium">Holidays ({holidays.length})</p>
        <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-600 text-zinc-300"
          onClick={() => setShowQuick(v => !v)}>
          {showQuick ? 'Hide Quick Add' : 'Quick Add Common'}
        </Button>
      </div>

      {/* Quick add common holidays */}
      {showQuick && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
          <p className="text-zinc-400 text-xs">Click to add common Indian public holidays for {new Date().getFullYear()}:</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_HOLIDAYS.filter(h => !existingDates.has(h.date)).map(h => (
              <button key={h.date} onClick={() => addQuick(h)}
                className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-700 hover:text-white transition-colors">
                + {h.name}
              </button>
            ))}
            {COMMON_HOLIDAYS.every(h => existingDates.has(h.date)) && (
              <p className="text-zinc-600 text-xs">All common holidays already added</p>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
        <p className="text-zinc-400 text-xs font-medium">Add Holiday</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-zinc-500 text-xs">Holiday Name</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Diwali" className="bg-zinc-900 border-zinc-700 text-white h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-500 text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => { setDate(e.target.value); setError('') }}
              className="bg-zinc-900 border-zinc-700 text-white h-8 text-xs" />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1 shrink-0" disabled={saving} onClick={handleAdd}>
            <Plus className="w-3 h-3" /> {saving ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* List */}
      {holidays.length === 0 ? (
        <div className="bg-zinc-800 rounded-lg px-4 py-6 text-center">
          <CalendarDays className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No holidays added yet</p>
          <p className="text-zinc-600 text-xs mt-1">Employees won&apos;t be able to apply leave on these dates</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-700/50">
          {holidays.map(h => (
            <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-medium">{h.name}</p>
                <p className="text-zinc-500 text-[10px]">{fmtDate(h.date)}</p>
              </div>
              <button onClick={() => handleDelete(h.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
