'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BalanceRow = {
  id: string
  employee_id: string
  leave_type_id: string
  accrued: number
  used: number
  carry_forward: number
  leave_types: { name: string; color: string | null; annual_quota: number } | null
  employees: { first_name: string; last_name: string; employee_code: string | null; is_active: boolean } | null
}

type EmployeeSummary = {
  employee_id: string
  first_name: string
  last_name: string
  employee_code: string | null
  balances: { leave_type: string; color: string | null; allocated: number; used: number; available: number }[]
}

function colorDot(color: string | null) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
      style={{ background: color || '#71717a' }}
    />
  )
}

export function LeaveBalancesPanel() {
  const [rows, setRows]       = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leave-balances')
      if (res.ok) {
        const { balances } = await res.json()
        setRows(balances || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  async function seedBalances() {
    setSeeding(true)
    setSeedMsg('')
    try {
      const res = await fetch('/api/admin/leave-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSeedMsg(`Seeded ${data.seeded} balance records for ${new Date().getFullYear()}`)
        fetchBalances()
      } else {
        setSeedMsg(data.error || 'Failed to seed')
      }
    } finally { setSeeding(false) }
  }

  // Group rows by employee
  const grouped: EmployeeSummary[] = []
  const seen = new Map<string, EmployeeSummary>()

  for (const row of rows) {
    const key = row.employee_id
    const emp = row.employees
    if (!seen.has(key)) {
      const summary: EmployeeSummary = {
        employee_id: key,
        first_name: emp?.first_name || '',
        last_name: emp?.last_name || '',
        employee_code: emp?.employee_code || null,
        balances: [],
      }
      seen.set(key, summary)
      grouped.push(summary)
    }
    const s = seen.get(key)!
    const allocated = (row.accrued || 0) + (row.carry_forward || 0)
    s.balances.push({
      leave_type: row.leave_types?.name || 'Unknown',
      color: row.leave_types?.color || null,
      allocated,
      used: row.used || 0,
      available: Math.max(0, allocated - (row.used || 0)),
    })
  }

  const filtered = grouped.filter(e => {
    if (!search) return true
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
    const code = e.employee_code?.toLowerCase() || ''
    return fullName.includes(search.toLowerCase()) || code.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">Leave Balances — {new Date().getFullYear()}</h3>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-700 text-green-400 hover:text-green-300 gap-1"
            onClick={seedBalances}
            disabled={seeding}
          >
            <Sprout className="w-3 h-3" />
            {seeding ? 'Seeding…' : `Seed ${new Date().getFullYear()}`}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={fetchBalances}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      {seedMsg && (
        <p className={`text-xs px-3 py-1.5 rounded-md ${seedMsg.includes('Failed') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {seedMsg}
        </p>
      )}

      {/* Search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <span className="text-zinc-600 text-[10px]">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div className="text-zinc-500 text-xs text-center py-8">Loading…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-zinc-500 text-sm text-center py-10">
          {rows.length === 0
            ? 'No leave balances found. Ensure leave types are configured and balances have been seeded.'
            : 'No employees match your search.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(emp => (
            <div key={emp.employee_id} className="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60">
                <span className="text-sm font-medium text-zinc-200">
                  {emp.first_name} {emp.last_name}
                </span>
                {emp.employee_code && (
                  <span className="text-[10px] text-zinc-500">#{emp.employee_code}</span>
                )}
              </div>

              {/* Balance pills */}
              <div className="px-4 py-3">
                {emp.balances.length === 0 ? (
                  <p className="text-xs text-zinc-600">No leave types assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {emp.balances.map(b => {
                      const pct = b.allocated > 0 ? Math.round((b.used / b.allocated) * 100) : 0
                      const low = b.available <= 2 && b.available < b.allocated
                      return (
                        <div
                          key={b.leave_type}
                          className={`flex flex-col bg-zinc-800 rounded-lg px-3 py-2 min-w-[90px] ${low ? 'ring-1 ring-red-500/30' : ''}`}
                        >
                          <div className="flex items-center text-[10px] text-zinc-400 mb-1">
                            {colorDot(b.color)}
                            {b.leave_type}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-base font-bold ${low ? 'text-red-400' : 'text-white'}`}>
                              {b.available}
                            </span>
                            <span className="text-[10px] text-zinc-500">/ {b.allocated}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1.5 h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-zinc-600 mt-0.5">{b.used} used</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
