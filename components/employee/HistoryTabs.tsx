'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { LeaveRequest, SalaryAdvance, SupportTicket, SalaryHistoryRecord, BonusHistoryRecord } from '@/types'

interface Props {
  leaveRequests: LeaveRequest[]
  advances: SalaryAdvance[]
  tickets: SupportTicket[]
  salaryHistory: SalaryHistoryRecord[]
  bonusHistory: BonusHistoryRecord[]
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    cancelled:'bg-zinc-700 text-zinc-400 border-zinc-600',
    open:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${map[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
      {status}
    </span>
  )
}

const fmt = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">{text}</div>
)

export function HistoryTabs({ leaveRequests, advances, tickets, salaryHistory, bonusHistory }: Props) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-4">
        <Tabs defaultValue="leaves">
          <TabsList className="bg-zinc-800 border border-zinc-700 mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="leaves" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Leaves {leaveRequests.length > 0 && <span className="ml-1 text-[10px] text-zinc-400">({leaveRequests.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="advances" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Advances {advances.length > 0 && <span className="ml-1 text-[10px] text-zinc-400">({advances.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="salary" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Salary History
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Bonuses {bonusHistory.length > 0 && <span className="ml-1 text-[10px] text-zinc-400">({bonusHistory.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white">
              Tickets {tickets.length > 0 && <span className="ml-1 text-[10px] text-zinc-400">({tickets.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* Leaves */}
          <TabsContent value="leaves">
            {leaveRequests.length === 0 ? (
              <EmptyState text="No leave requests yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {leaveRequests.map(lr => (
                  <div key={lr.id} className="flex items-center justify-between bg-zinc-800 rounded-md px-3 py-2.5">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">{lr.leave_type} Leave</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {fmt(lr.leave_date)}{lr.end_date ? ` → ${fmt(lr.end_date)}` : ''}
                      </p>
                      {lr.manager_comment && (
                        <p className="text-xs text-zinc-400 mt-0.5 italic">"{lr.manager_comment}"</p>
                      )}
                    </div>
                    {statusBadge(lr.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Advances */}
          <TabsContent value="advances">
            {advances.length === 0 ? (
              <EmptyState text="No advance requests yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {advances.map(adv => (
                  <div key={adv.id} className="flex items-center justify-between bg-zinc-800 rounded-md px-3 py-2.5">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">
                        ₹{Number(adv.amount).toLocaleString('en-IN')}
                        {adv.approved_amount && adv.approved_amount !== adv.amount && (
                          <span className="text-zinc-400 text-xs ml-1">
                            (approved ₹{Number(adv.approved_amount).toLocaleString('en-IN')})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{adv.reason}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{fmt(adv.created_at)}</p>
                    </div>
                    {statusBadge(adv.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Salary History */}
          <TabsContent value="salary">
            {salaryHistory.length === 0 ? (
              <EmptyState text="No salary changes on record" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {salaryHistory.map(sh => (
                  <div key={sh.id} className="flex items-center justify-between bg-zinc-800 rounded-md px-3 py-2.5">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">
                        ₹{Number(sh.old_salary).toLocaleString('en-IN')}
                        <span className="text-zinc-500 mx-1">→</span>
                        <span className="text-green-400">₹{Number(sh.new_salary).toLocaleString('en-IN')}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">Effective {fmt(sh.start_month)}</p>
                    </div>
                    <span className="text-xs text-green-400 font-medium">
                      +₹{(Number(sh.new_salary) - Number(sh.old_salary)).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bonuses */}
          <TabsContent value="bonuses">
            {bonusHistory.length === 0 ? (
              <EmptyState text="No bonuses on record" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {bonusHistory.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-zinc-800 rounded-md px-3 py-2.5">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">{b.reason}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{fmt(b.bonus_month)}</p>
                    </div>
                    <span className="text-green-400 font-semibold text-sm">
                      +₹{Number(b.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tickets */}
          <TabsContent value="tickets">
            {tickets.length === 0 ? (
              <EmptyState text="No support tickets yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {tickets.map(t => (
                  <div key={t.id} className="bg-zinc-800 rounded-md px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-200 font-medium">{t.subject}</p>
                      {statusBadge(t.status)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.message}</p>
                    {t.manager_reply && (
                      <div className="mt-1.5 pl-2 border-l-2 border-blue-500/40">
                        <p className="text-xs text-blue-400">Reply: {t.manager_reply}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-1">{fmt(t.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
