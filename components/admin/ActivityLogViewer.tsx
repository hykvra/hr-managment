'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LogEntry = {
  id: string
  actor_email: string | null
  actor_role: string | null
  action: string
  entity_type: string | null
  entity_name: string | null
  details: Record<string, unknown>
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  approved: 'text-green-400', rejected: 'text-red-400', paid: 'text-blue-400',
  login: 'text-zinc-400', logout: 'text-zinc-500', created: 'text-blue-400',
  generated: 'text-purple-400', updated: 'text-yellow-400', deactivated: 'text-red-400',
  reactivated: 'text-green-400', submitted: 'text-zinc-400', withdrawn: 'text-zinc-500',
}

function actionColor(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_COLOR)) {
    if (action.includes(key)) return cls
  }
  return 'text-zinc-400'
}

function fmtAction(action: string): string {
  return action.replace(/_/g, ' ')
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'auth', label: 'Auth' },
  { value: 'employees', label: 'Employees' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'advances', label: 'Advances' },
  { value: 'loans', label: 'Loans' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'resignation', label: 'Resignations' },
]

export function ActivityLogViewer() {
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo)   params.set('date_to', dateTo)
      const res = await fetch(`/api/admin/activity-logs?${params}`)
      if (res.ok) {
        const { logs: data, total: t } = await res.json()
        setLogs(data || [])
        setTotal(t || 0)
      }
    } finally { setLoading(false) }
  }, [category, dateFrom, dateTo, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = search
    ? logs.filter(l =>
        l.action.includes(search.toLowerCase()) ||
        (l.actor_email?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (l.entity_name?.toLowerCase() || '').includes(search.toLowerCase())
      )
    : logs

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(0) }}
          className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }}
          className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white w-36" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }}
          className="h-8 text-xs bg-zinc-800 border-zinc-700 text-white w-36" />
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <Input placeholder="Filter action / email…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs bg-zinc-800 border-zinc-700 text-white" />
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400" onClick={fetchLogs}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary */}
      <p className="text-zinc-500 text-[10px]">
        {total.toLocaleString()} total log{total !== 1 ? 's' : ''}
        {search && ` · ${filtered.length} matching`}
      </p>

      {loading && <div className="text-zinc-500 text-xs py-6 text-center">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-zinc-500 text-sm py-8 text-center">No logs found</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-zinc-800/80 sticky top-0">
                <tr>
                  {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    <td className="px-3 py-2">
                      <p className="text-zinc-300 truncate max-w-[120px]">{log.actor_email || '—'}</p>
                      {log.actor_role && (
                        <p className="text-zinc-600 text-[9px]">{log.actor_role.replace('_', ' ')}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${actionColor(log.action)}`}>{fmtAction(log.action)}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-400 truncate max-w-[100px]">
                      {log.entity_name || log.entity_type || '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 max-w-[160px] truncate">
                      {Object.keys(log.details).length > 0
                        ? Object.entries(log.details)
                            .filter(([, v]) => v !== null && v !== '')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center gap-2 justify-center">
          <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Button>
          <span className="text-zinc-500 text-xs">Page {page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  )
}
