'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'

type DirectoryEmployee = {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
  department: string | null
  profile_photo: string | null
  joining_date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shifts: any
}

function initials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([])
  const [loading, setLoading]     = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [expanded, setExpanded]   = useState(false)

  async function load() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch('/api/employees/directory')
      if (res.ok) {
        const { employees: data } = await res.json()
        setEmployees(data || [])
        setLoaded(true)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean) as string[])
    return Array.from(depts).sort()
  }, [employees])

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const term = search.toLowerCase()
      const matchSearch = !term ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
        (e.employee_code?.toLowerCase() || '').includes(term) ||
        (e.department?.toLowerCase() || '').includes(term)
      const matchDept = deptFilter === 'all' || e.department === deptFilter
      return matchSearch && matchDept
    })
  }, [employees, search, deptFilter])

  const shown = expanded ? filtered : filtered.slice(0, 8)

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search colleagues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-8 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Depts</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {loading && <div className="text-zinc-500 text-xs text-center py-4">Loading…</div>}

      {!loading && loaded && filtered.length === 0 && (
        <div className="flex flex-col items-center py-6 text-zinc-600 gap-2">
          <Users className="w-7 h-7" />
          <p className="text-sm">No colleagues found</p>
        </div>
      )}

      {!loading && shown.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {shown.map(emp => (
              <div key={emp.id} className="bg-zinc-800 rounded-lg p-3 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden shrink-0 border border-zinc-600">
                  {emp.profile_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={emp.profile_photo} alt={emp.first_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                      {initials(emp.first_name, emp.last_name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-zinc-200 text-xs font-medium truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  {emp.employee_code && (
                    <p className="text-zinc-600 text-[10px] font-mono">#{emp.employee_code}</p>
                  )}
                  {emp.department && (
                    <p className="text-zinc-500 text-[10px] truncate">{emp.department}</p>
                  )}
                  {emp.shifts?.name && (
                    <p className="text-zinc-600 text-[10px]">{emp.shifts.name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 8 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-blue-400 hover:text-blue-300 w-full text-center py-1"
            >
              {expanded ? 'Show less' : `Show all ${filtered.length} colleagues`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
