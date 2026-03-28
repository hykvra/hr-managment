'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type TicketWithEmployee = {
  id: string
  subject: string
  message: string
  created_at: string
  employees: { first_name: string; last_name: string; employee_code: string | null }
}

interface Props {
  openTickets: TicketWithEmployee[]
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export function TicketManagement({ openTickets }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleResolve(id: string) {
    const reply = replies[id]
    if (!reply?.trim()) { setErrors(e => ({ ...e, [id]: 'Reply is required' })); return }
    setLoadingId(id)
    setErrors(e => ({ ...e, [id]: '' }))
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim() }),
      })
      if (res.ok) { setExpandedId(null); router.refresh() }
    } finally {
      setLoadingId(null)
    }
  }

  if (openTickets.length === 0) {
    return <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No open support tickets</div>
  }

  return (
    <div className="space-y-2">
      {openTickets.map(t => {
        const emp = t.employees
        const isExpanded = expandedId === t.id
        return (
          <div key={t.id} className="bg-zinc-800 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white font-medium text-sm">{emp.first_name} {emp.last_name}</span>
                  {emp.employee_code && <span className="text-zinc-500 text-xs font-mono">#{emp.employee_code}</span>}
                  <span className="text-blue-400 text-[10px] px-2 py-0.5 bg-blue-500/10 rounded-full">open</span>
                </div>
                <p className="text-zinc-300 text-xs mt-0.5 font-medium truncate">{t.subject}</p>
                <p className="text-zinc-600 text-xs">{fmt(t.created_at)}</p>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />}
            </div>
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-700 pt-3">
                <div className="bg-zinc-900 rounded-md p-3 text-zinc-300 text-sm leading-relaxed">
                  {t.message}
                </div>
                <div className="space-y-1.5">
                  <Textarea
                    placeholder="Write your reply…"
                    rows={3}
                    value={replies[t.id] || ''}
                    onChange={e => { setReplies(r => ({ ...r, [t.id]: e.target.value })); setErrors(er => ({ ...er, [t.id]: '' })) }}
                  />
                  {errors[t.id] && <p className="text-xs text-red-400">{errors[t.id]}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedId(null)}>Cancel</Button>
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700"
                    disabled={loadingId === t.id} onClick={() => handleResolve(t.id)}>
                    {loadingId === t.id ? 'Resolving…' : 'Reply & Resolve'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
