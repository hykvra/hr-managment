'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Printer, Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Employee = { id: string; first_name: string; last_name: string; employee_code: string | null; department: string | null }

type Review = {
  id: string
  review_period: string
  period_start: string
  period_end: string
  overall_rating: number | null
  attendance_rating: number | null
  performance_rating: number | null
  behavior_rating: number | null
  strengths: string | null
  improvements: string | null
  goals: string | null
  comments: string | null
  status: 'draft' | 'published'
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null; department: string | null } | null
  reviewer: { first_name: string; last_name: string } | null
}

const RATING_LABEL: Record<number, string> = {
  1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent',
}

function ratingColor(r: number | null): string {
  if (!r) return 'text-zinc-500'
  if (r >= 4.5) return 'text-green-400'
  if (r >= 3.5) return 'text-blue-400'
  if (r >= 2.5) return 'text-yellow-400'
  return 'text-red-400'
}

function RatingStars({ value }: { value: number | null }) {
  if (!value) return <span className="text-zinc-600 text-xs">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`}
        />
      ))}
      <span className={`ml-1 text-xs font-medium ${ratingColor(value)}`}>{value.toFixed(1)}</span>
    </span>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function printReview(review: Review) {
  const emp = review.employees
  const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'
  const reviewer = review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '—'

  const ratingRow = (label: string, val: number | null) => val
    ? `<div class="row"><span class="lbl">${label}</span><span class="stars">${'★'.repeat(Math.round(val))}${'☆'.repeat(5 - Math.round(val))} <b>${val.toFixed(1)}</b> — ${RATING_LABEL[Math.round(val)] || ''}</span></div>`
    : ''

  const textRow = (label: string, val: string | null) => val
    ? `<div class="section"><div class="section-title">${label}</div><div class="section-body">${val}</div></div>`
    : ''

  const html = `<!DOCTYPE html><html><head><title>Performance Review</title>
<style>
@page{size:A4;margin:16mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}
.hdr{border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px}
.hdr h1{font-size:20px;font-weight:bold;color:#1e3a5f}
.hdr h2{font-size:12px;color:#555;margin-top:4px;letter-spacing:2px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;background:#f5f7fa;padding:10px;border-radius:4px}
.meta-row{display:flex;gap:4px}.meta-lbl{color:#777;min-width:90px}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #ddd}
.lbl{color:#555}
.stars{color:#d97706;letter-spacing:1px}
.section{margin:10px 0}.section-title{font-weight:bold;font-size:10px;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.section-body{background:#f9f9f9;padding:8px;border-radius:4px;border-left:3px solid #1e3a5f;line-height:1.5}
.status{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;letter-spacing:1px;background:${review.status === 'published' ? '#dcfce7' : '#fef9c3'};color:${review.status === 'published' ? '#166534' : '#854d0e'}}
.footer{margin-top:32px;display:flex;justify-content:space-between}
.sig{text-align:center}.sig-line{border-top:1px solid #999;width:140px;margin:0 auto 4px}.sig-lbl{font-size:10px;color:#777}
</style></head><body>
<div class="hdr"><h1>Performance Review</h1><h2>ESAM HR PORTAL</h2></div>
<div class="meta">
  <div class="meta-row"><span class="meta-lbl">Employee:</span><strong>${empName}</strong></div>
  <div class="meta-row"><span class="meta-lbl">Code:</span><span>${emp?.employee_code || '—'}</span></div>
  <div class="meta-row"><span class="meta-lbl">Department:</span><span>${emp?.department || '—'}</span></div>
  <div class="meta-row"><span class="meta-lbl">Reviewer:</span><span>${reviewer}</span></div>
  <div class="meta-row"><span class="meta-lbl">Period:</span><strong>${review.review_period}</strong></div>
  <div class="meta-row"><span class="meta-lbl">Status:</span><span class="status">${review.status.toUpperCase()}</span></div>
</div>
<div style="margin-bottom:12px"><strong>Period:</strong> ${fmtDate(review.period_start)} → ${fmtDate(review.period_end)}</div>
${ratingRow('Overall Rating', review.overall_rating)}
${ratingRow('Performance', review.performance_rating)}
${ratingRow('Attendance', review.attendance_rating)}
${ratingRow('Behaviour', review.behavior_rating)}
${textRow('Strengths', review.strengths)}
${textRow('Areas for Improvement', review.improvements)}
${textRow('Goals', review.goals)}
${textRow('Comments', review.comments)}
<div class="footer">
  <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Reviewer Signature</div></div>
  <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Employee Signature</div></div>
  <div class="sig"><div class="sig-line"></div><div class="sig-lbl">HR Signature</div></div>
</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url) } }
  else URL.revokeObjectURL(url)
}

const EMPTY_FORM = {
  employee_id: '',
  review_period: '',
  period_start: '',
  period_end: '',
  overall_rating: '',
  attendance_rating: '',
  performance_rating: '',
  behavior_rating: '',
  strengths: '',
  improvements: '',
  goals: '',
  comments: '',
  status: 'draft' as 'draft' | 'published',
}

export function PerformanceReviews() {
  const [reviews, setReviews]         = useState<Review[]>([])
  const [employees, setEmployees]     = useState<Employee[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [empFilter, setEmpFilter]     = useState('')
  const [form, setForm]               = useState(EMPTY_FORM)
  const [error, setError]             = useState('')

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (empFilter) params.set('employee_id', empFilter)
      const res = await fetch(`/api/admin/performance-reviews?${params}`)
      if (res.ok) {
        const { reviews: data } = await res.json()
        setReviews(data || [])
      }
    } finally { setLoading(false) }
  }, [statusFilter, empFilter])

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  function fieldNum(val: string): number | undefined {
    const n = parseFloat(val)
    if (isNaN(n) || n < 1 || n > 5) return undefined
    return Math.round(n * 10) / 10
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.employee_id || !form.review_period || !form.period_start || !form.period_end) {
      setError('Employee, Period label, Start date and End date are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/performance-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employee_id,
          review_period: form.review_period,
          period_start: form.period_start,
          period_end: form.period_end,
          overall_rating: fieldNum(form.overall_rating),
          attendance_rating: fieldNum(form.attendance_rating),
          performance_rating: fieldNum(form.performance_rating),
          behavior_rating: fieldNum(form.behavior_rating),
          strengths: form.strengths || undefined,
          improvements: form.improvements || undefined,
          goals: form.goals || undefined,
          comments: form.comments || undefined,
          status: form.status,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg || 'Failed to save review')
        return
      }
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchReviews()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this performance review?')) return
    await fetch(`/api/admin/performance-reviews/${id}`, { method: 'DELETE' })
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  async function togglePublish(review: Review) {
    const newStatus = review.status === 'draft' ? 'published' : 'draft'
    const res = await fetch(`/api/admin/performance-reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: newStatus } : r))
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">Performance Reviews</h3>
        <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => { setShowForm(v => !v); setError('') }}>
          <Plus className="w-3.5 h-3.5" />
          {showForm ? 'Cancel' : 'New Review'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-300">New Performance Review</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Employee *</Label>
              <select
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none"
              >
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Review Period Label *</Label>
              <Input placeholder="e.g. Q1 2025" value={form.review_period}
                onChange={e => setForm(f => ({ ...f, review_period: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Period Start *</Label>
              <Input type="date" value={form.period_start}
                onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">Period End *</Label>
              <Input type="date" value={form.period_end}
                onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'overall_rating', label: 'Overall (1–5)' },
              { key: 'performance_rating', label: 'Performance' },
              { key: 'attendance_rating', label: 'Attendance' },
              { key: 'behavior_rating', label: 'Behaviour' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <Input
                  type="number" min="1" max="5" step="0.1"
                  placeholder="1–5"
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            ))}
          </div>

          {/* Textareas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'strengths', label: 'Strengths' },
              { key: 'improvements', label: 'Areas for Improvement' },
              { key: 'goals', label: 'Goals' },
              { key: 'comments', label: 'Comments' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <Textarea
                  rows={2}
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="text-xs bg-zinc-900 border-zinc-700 text-white resize-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-xs text-zinc-400">Status</Label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
              className="h-7 bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published (visible to employee)</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" disabled={saving}>
            {saving ? 'Saving…' : 'Save Review'}
          </Button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); }}
          className="h-7 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={empFilter}
          onChange={e => setEmpFilter(e.target.value)}
          className="h-7 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none"
        >
          <option value="">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>
        <span className="text-zinc-600 text-[10px]">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
      </div>

      {/* List */}
      {loading && (
        <div className="text-zinc-500 text-xs text-center py-8">Loading…</div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="text-zinc-500 text-sm text-center py-10">No reviews found</div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map(review => {
            const emp = review.employees
            const isExpanded = expandedId === review.id
            return (
              <div key={review.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                {/* Summary row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-200">
                        {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}
                      </span>
                      {emp?.employee_code && (
                        <span className="text-[10px] text-zinc-500">#{emp.employee_code}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        review.status === 'published'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {review.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-zinc-400">{review.review_period}</span>
                      <span className="text-[10px] text-zinc-600">
                        {fmtDate(review.period_start)} – {fmtDate(review.period_end)}
                      </span>
                      {review.overall_rating && (
                        <RatingStars value={review.overall_rating} />
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost"
                      className="h-7 text-[10px] px-2 text-zinc-400 hover:text-white"
                      onClick={() => togglePublish(review)}>
                      {review.status === 'draft' ? 'Publish' : 'Unpublish'}
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                      onClick={() => printReview(review)}>
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                      onClick={() => handleDelete(review.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <button onClick={() => setExpandedId(isExpanded ? null : review.id)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-zinc-800/40 border-t border-zinc-800 space-y-3">
                    {/* Ratings grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Overall', val: review.overall_rating },
                        { label: 'Performance', val: review.performance_rating },
                        { label: 'Attendance', val: review.attendance_rating },
                        { label: 'Behaviour', val: review.behavior_rating },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-zinc-800 rounded-md px-3 py-2">
                          <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                          <RatingStars value={val} />
                        </div>
                      ))}
                    </div>

                    {/* Text fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Strengths', val: review.strengths },
                        { label: 'Areas for Improvement', val: review.improvements },
                        { label: 'Goals', val: review.goals },
                        { label: 'Comments', val: review.comments },
                      ].filter(({ val }) => val).map(({ label, val }) => (
                        <div key={label}>
                          <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                          <p className="text-xs text-zinc-300 bg-zinc-800 rounded-md px-3 py-2">{val}</p>
                        </div>
                      ))}
                    </div>

                    {review.reviewer && (
                      <p className="text-[10px] text-zinc-600">
                        Reviewed by: {review.reviewer.first_name} {review.reviewer.last_name}
                        · Created {fmtDate(review.created_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
