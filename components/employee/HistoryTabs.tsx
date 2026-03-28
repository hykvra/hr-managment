'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LeaveRequest, SalaryAdvance, SupportTicket, SalaryHistoryRecord, BonusHistoryRecord } from '@/types'

type Payslip = {
  id: string; month: string; base_salary: number
  days_present: number; days_half: number; days_double: number
  days_absent: number; days_uninformed: number; days_leave: number
  payable_days: number; gross_salary: number; penalty_deduction: number
  advance_deduction: number; bonus: number; net_salary: number
  paid_at: string | null; notes: string | null
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function buildPayslipHtml(p: Payslip): string {
  const d = new Date(p.month)
  const monthLabel = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return [
    '<!DOCTYPE html><html><head><title>Payslip</title>',
    '<style>@page{size:A5 landscape;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}',
    '.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}',
    '.hdr h1{font-size:18px;font-weight:bold}.hdr h2{font-size:12px;margin-top:3px;letter-spacing:3px;color:#444}',
    '.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #ddd}',
    '.lbl{color:#555}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}',
    '.box{background:#f5f5f5;padding:6px;border-radius:4px}.bl{font-size:9px;color:#888;margin-bottom:2px}',
    '.bv{font-size:13px;font-weight:bold}',
    '.net{font-size:22px;font-weight:bold;text-align:center;padding:12px;border:2px solid #000;margin:14px 0;border-radius:4px}',
    '.sigs{display:flex;justify-content:space-between;margin-top:24px}',
    '.sl{border-top:1px solid #000;width:120px;margin:0 auto 4px}.sg{font-size:10px;color:#555;text-align:center}',
    '</style></head><body>',
    '<div class="hdr"><h1>ESAM HR Portal</h1><h2>SALARY PAYSLIP — ' + monthLabel.toUpperCase() + '</h2></div>',
    '<div class="row"><span class="lbl">Month</span><strong>' + monthLabel + '</strong></div>',
    '<div class="row"><span class="lbl">Base Salary</span><span>₹' + Math.round(p.base_salary).toLocaleString('en-IN') + '</span></div>',
    '<div class="grid">',
    '<div class="box"><div class="bl">Present</div><div class="bv">' + p.days_present + '</div></div>',
    '<div class="box"><div class="bl">Half Day</div><div class="bv">' + p.days_half + '</div></div>',
    '<div class="box"><div class="bl">Double</div><div class="bv">' + p.days_double + '</div></div>',
    '<div class="box"><div class="bl">Leave</div><div class="bv">' + p.days_leave + '</div></div>',
    '<div class="box"><div class="bl">Absent</div><div class="bv">' + p.days_absent + '</div></div>',
    '<div class="box"><div class="bl" style="color:#dc2626">Uninformed</div><div class="bv" style="color:#dc2626">' + p.days_uninformed + '</div></div>',
    '</div>',
    '<div class="row"><span class="lbl">Payable Days</span><span>' + p.payable_days + '</span></div>',
    '<div class="row"><span class="lbl">Gross Salary</span><span>₹' + Math.round(p.gross_salary).toLocaleString('en-IN') + '</span></div>',
    p.penalty_deduction > 0 ? '<div class="row"><span class="lbl">Penalty</span><span style="color:#dc2626">−₹' + Math.round(p.penalty_deduction).toLocaleString('en-IN') + '</span></div>' : '',
    p.advance_deduction > 0 ? '<div class="row"><span class="lbl">Advance Deducted</span><span style="color:#d97706">−₹' + Math.round(p.advance_deduction).toLocaleString('en-IN') + '</span></div>' : '',
    p.bonus > 0 ? '<div class="row"><span class="lbl">Bonus</span><span style="color:#16a34a">+₹' + Math.round(p.bonus).toLocaleString('en-IN') + '</span></div>' : '',
    '<div class="net">Net Pay: ₹' + Math.round(p.net_salary).toLocaleString('en-IN') + '</div>',
    '<div class="sigs"><div><div class="sl"></div><div class="sg">Authorized Signature</div></div>',
    '<div><div class="sl"></div><div class="sg">Employee Signature</div></div></div>',
    '</body></html>',
  ].join('')
}

function printPayslip(p: Payslip) {
  const html = buildPayslipHtml(p)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url) } }
  else URL.revokeObjectURL(url)
}

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
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [payslipsLoaded, setPayslipsLoaded] = useState(false)
  const [payslipsLoading, setPayslipsLoading] = useState(false)

  async function loadPayslips() {
    if (payslipsLoaded) return
    setPayslipsLoading(true)
    try {
      const res = await fetch('/api/employees/payslip')
      if (res.ok) {
        const { payslips: data } = await res.json() as { payslips: Payslip[] }
        setPayslips(data)
        setPayslipsLoaded(true)
      }
    } finally {
      setPayslipsLoading(false)
    }
  }

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
            <TabsTrigger value="payslips" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadPayslips}>
              Payslips
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
                        <p className="text-xs text-zinc-400 mt-0.5 italic">&quot;{lr.manager_comment}&quot;</p>
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
          {/* Payslips */}
          <TabsContent value="payslips">
            {payslipsLoading ? (
              <EmptyState text="Loading payslips…" />
            ) : !payslipsLoaded ? (
              <EmptyState text="Click the Payslips tab to load" />
            ) : payslips.length === 0 ? (
              <EmptyState text="No paid payslips yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {payslips.map(p => {
                  const d = new Date(p.month)
                  const label = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-zinc-800 rounded-md px-3 py-2.5">
                      <div>
                        <p className="text-sm text-zinc-200 font-medium">{label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {p.days_present}P · {p.days_half}H · {p.days_double}D · {p.days_uninformed}U
                          {p.advance_deduction > 0 && ` · Adv −₹${Math.round(p.advance_deduction).toLocaleString('en-IN')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-sm">
                          ₹{Math.round(p.net_salary).toLocaleString('en-IN')}
                        </span>
                        <Button size="sm" variant="outline"
                          className="h-6 text-[10px] px-2 border-zinc-700 gap-1"
                          onClick={() => printPayslip(p)}>
                          <Printer className="w-3 h-3" /> Print
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
