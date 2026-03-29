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

type LoanItem = {
  id: string
  amount: number
  reason: string
  emi_amount: number
  disbursed_on: string
  months_total: number
  months_paid: number
  status: string
}

type ExpenseItem = {
  id: string
  amount: number
  category: string
  description: string
  status: string
  approved_amount: number | null
  manager_note: string | null
  created_at: string
}

const EXPENSE_ICON: Record<string, string> = {
  Travel: '✈️', Food: '🍽️', Medical: '🏥', Equipment: '🖥️', Accommodation: '🏨', Other: '📎',
}

export function HistoryTabs({ leaveRequests, advances, tickets, salaryHistory, bonusHistory }: Props) {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [payslipsLoaded, setPayslipsLoaded] = useState(false)
  const [payslipsLoading, setPayslipsLoading] = useState(false)

  const [loans, setLoans]             = useState<LoanItem[]>([])
  const [loansLoaded, setLoansLoaded] = useState(false)
  const [loansLoading, setLoansLoading] = useState(false)

  const [expenses, setExpenses]             = useState<ExpenseItem[]>([])
  const [expensesLoaded, setExpensesLoaded] = useState(false)
  const [expensesLoading, setExpensesLoading] = useState(false)

  const [warnings, setWarnings]             = useState<{ id: string; warning_type: string; subject: string; description: string; issued_on: string; acknowledged_at: string | null }[]>([])
  const [warningsLoaded, setWarningsLoaded] = useState(false)
  const [warningsLoading, setWarningsLoading] = useState(false)

  const [regularizations, setRegularizations] = useState<{ id: string; date: string; requested_status: string; reason: string; status: string; manager_note: string | null }[]>([])
  const [regsLoaded, setRegsLoaded]           = useState(false)
  const [regsLoading, setRegsLoading]         = useState(false)

  type ReviewItem = {
    id: string
    review_period: string
    period_start: string
    period_end: string
    overall_rating: number | null
    performance_rating: number | null
    attendance_rating: number | null
    behavior_rating: number | null
    strengths: string | null
    improvements: string | null
    goals: string | null
    comments: string | null
    created_at: string
    reviewer: { first_name: string; last_name: string } | null
  }
  const [reviews, setReviews]           = useState<ReviewItem[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)

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

  async function loadWarnings() {
    if (warningsLoaded) return
    setWarningsLoading(true)
    try {
      const res = await fetch('/api/employees/warnings')
      if (res.ok) {
        const { warnings: data } = await res.json()
        setWarnings(data || [])
        setWarningsLoaded(true)
      }
    } finally { setWarningsLoading(false) }
  }

  async function loadRegularizations() {
    if (regsLoaded) return
    setRegsLoading(true)
    try {
      const res = await fetch('/api/employees/regularization')
      if (res.ok) {
        const { regularizations: data } = await res.json()
        setRegularizations(data || [])
        setRegsLoaded(true)
      }
    } finally { setRegsLoading(false) }
  }

  async function loadExpenses() {
    if (expensesLoaded) return
    setExpensesLoading(true)
    try {
      const res = await fetch('/api/employees/expenses')
      if (res.ok) {
        const { expenses: data } = await res.json()
        setExpenses(data || [])
        setExpensesLoaded(true)
      }
    } finally {
      setExpensesLoading(false)
    }
  }

  async function loadLoans() {
    if (loansLoaded) return
    setLoansLoading(true)
    try {
      const res = await fetch('/api/employees/loans')
      if (res.ok) {
        const { loans: data } = await res.json()
        setLoans(data || [])
        setLoansLoaded(true)
      }
    } finally {
      setLoansLoading(false)
    }
  }

  async function loadReviews() {
    if (reviewsLoaded) return
    setReviewsLoading(true)
    try {
      const res = await fetch('/api/employees/performance-reviews')
      if (res.ok) {
        const { reviews: data } = await res.json()
        setReviews(data || [])
        setReviewsLoaded(true)
      }
    } finally { setReviewsLoading(false) }
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
            <TabsTrigger value="loans" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadLoans}>
              Loans
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadExpenses}>
              Expenses
            </TabsTrigger>
            <TabsTrigger value="warnings" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadWarnings}>
              Warnings
            </TabsTrigger>
            <TabsTrigger value="regularize" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadRegularizations}>
              Regularizations
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
              onClick={loadReviews}>
              Reviews
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
          {/* Warnings */}
          <TabsContent value="warnings">
            {warningsLoading ? (
              <EmptyState text="Loading warnings…" />
            ) : !warningsLoaded ? (
              <EmptyState text="Click the Warnings tab to load" />
            ) : warnings.length === 0 ? (
              <EmptyState text="No warning letters on record" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {warnings.map(w => {
                  const TYPE_CLS: Record<string, string> = {
                    verbal:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    written: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    final:   'bg-red-500/10 text-red-400 border-red-500/20',
                  }
                  return (
                    <div key={w.id} className="bg-zinc-800 rounded-md px-3 py-2.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_CLS[w.warning_type] || ''}`}>
                          {w.warning_type}
                        </span>
                        <span className="text-zinc-200 text-sm font-medium">{w.subject}</span>
                      </div>
                      <p className="text-zinc-500 text-xs line-clamp-2">{w.description}</p>
                      <p className="text-[10px] text-zinc-600">{fmt(w.issued_on)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Regularizations */}
          <TabsContent value="regularize">
            {regsLoading ? (
              <EmptyState text="Loading requests…" />
            ) : !regsLoaded ? (
              <EmptyState text="Click the Regularizations tab to load" />
            ) : regularizations.length === 0 ? (
              <EmptyState text="No regularization requests yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {regularizations.map(reg => {
                  const REG_STATUS_CLS: Record<string, string> = {
                    pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
                    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
                  }
                  return (
                    <div key={reg.id} className="flex items-start justify-between bg-zinc-800 rounded-md px-3 py-2.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-zinc-200 text-sm font-medium">{fmt(reg.date)}</span>
                          <span className="text-blue-400 text-[10px]">→ {reg.requested_status}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${REG_STATUS_CLS[reg.status] || ''}`}>
                            {reg.status}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">{reg.reason}</p>
                        {reg.manager_note && (
                          <p className="text-zinc-600 text-[10px] mt-0.5 italic">{reg.manager_note}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Expenses */}
          <TabsContent value="expenses">
            {expensesLoading ? (
              <EmptyState text="Loading expenses…" />
            ) : !expensesLoaded ? (
              <EmptyState text="Click the Expenses tab to load" />
            ) : expenses.length === 0 ? (
              <EmptyState text="No expense requests yet" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {expenses.map(exp => {
                  const STATUS_CLS: Record<string, string> = {
                    pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
                    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
                  }
                  return (
                    <div key={exp.id} className="flex items-start justify-between bg-zinc-800 rounded-md px-3 py-2.5 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{EXPENSE_ICON[exp.category] || '📎'}</span>
                          <span className="text-zinc-200 text-sm font-medium">{exp.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CLS[exp.status] || ''}`}>
                            {exp.status}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">{exp.description}</p>
                        {exp.manager_note && (
                          <p className="text-zinc-600 text-[10px] mt-0.5 italic">{exp.manager_note}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-0.5">{fmt(exp.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold text-sm">₹{Math.round(exp.amount).toLocaleString('en-IN')}</p>
                        {exp.approved_amount && exp.approved_amount !== exp.amount && (
                          <p className="text-green-400 text-[10px]">
                            Approved ₹{Math.round(exp.approved_amount).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Performance Reviews */}
          <TabsContent value="reviews">
            {reviewsLoading ? (
              <EmptyState text="Loading reviews…" />
            ) : !reviewsLoaded ? (
              <EmptyState text="Click the Reviews tab to load" />
            ) : reviews.length === 0 ? (
              <EmptyState text="No published reviews yet" />
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {reviews.map(rv => {
                  const stars = (val: number | null) =>
                    val ? `${'★'.repeat(Math.round(val))}${'☆'.repeat(5 - Math.round(val))} ${val.toFixed(1)}` : null
                  return (
                    <div key={rv.id} className="bg-zinc-800 rounded-md px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{rv.review_period}</p>
                          <p className="text-[10px] text-zinc-500">
                            {fmt(rv.period_start)} – {fmt(rv.period_end)}
                          </p>
                        </div>
                        {rv.overall_rating && (
                          <span className="text-yellow-400 text-sm font-medium">
                            {stars(rv.overall_rating)}
                          </span>
                        )}
                      </div>
                      {(rv.performance_rating || rv.attendance_rating || rv.behavior_rating) && (
                        <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
                          {rv.performance_rating && <span>Perf: <span className="text-yellow-400">{rv.performance_rating.toFixed(1)}</span></span>}
                          {rv.attendance_rating && <span>Att: <span className="text-yellow-400">{rv.attendance_rating.toFixed(1)}</span></span>}
                          {rv.behavior_rating && <span>Beh: <span className="text-yellow-400">{rv.behavior_rating.toFixed(1)}</span></span>}
                        </div>
                      )}
                      {rv.strengths && (
                        <div>
                          <p className="text-[10px] text-zinc-500 mb-0.5">Strengths</p>
                          <p className="text-xs text-zinc-300">{rv.strengths}</p>
                        </div>
                      )}
                      {rv.improvements && (
                        <div>
                          <p className="text-[10px] text-zinc-500 mb-0.5">Areas to Improve</p>
                          <p className="text-xs text-zinc-300">{rv.improvements}</p>
                        </div>
                      )}
                      {rv.goals && (
                        <div>
                          <p className="text-[10px] text-zinc-500 mb-0.5">Goals</p>
                          <p className="text-xs text-zinc-300">{rv.goals}</p>
                        </div>
                      )}
                      {rv.comments && (
                        <p className="text-xs text-zinc-400 italic">&quot;{rv.comments}&quot;</p>
                      )}
                      {rv.reviewer && (
                        <p className="text-[10px] text-zinc-600">
                          Reviewed by {rv.reviewer.first_name} {rv.reviewer.last_name} · {fmt(rv.created_at)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Loans */}
          <TabsContent value="loans">
            {loansLoading ? (
              <EmptyState text="Loading loans…" />
            ) : !loansLoaded ? (
              <EmptyState text="Click the Loans tab to load" />
            ) : loans.length === 0 ? (
              <EmptyState text="No loans on record" />
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {loans.map(loan => {
                  const balance = Math.max(0, loan.amount - loan.emi_amount * loan.months_paid)
                  const pct = loan.months_total > 0 ? Math.round((loan.months_paid / loan.months_total) * 100) : 0
                  const STATUS_CLS: Record<string, string> = {
                    active:    'bg-green-500/10 text-green-400 border-green-500/20',
                    cleared:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                  }
                  return (
                    <div key={loan.id} className="bg-zinc-800 rounded-md px-3 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-zinc-200 font-medium">
                            ₹{Math.round(loan.amount).toLocaleString('en-IN')}
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CLS[loan.status] || ''}`}>
                              {loan.status}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">{loan.reason}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            Disbursed {fmt(loan.disbursed_on)} · EMI ₹{Math.round(loan.emi_amount).toLocaleString('en-IN')}/mo
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-zinc-400">{loan.months_paid}/{loan.months_total} paid</p>
                          {loan.status === 'active' && (
                            <p className="text-xs text-zinc-300 font-medium">
                              Bal ₹{Math.round(balance).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${loan.status === 'cleared' ? 'bg-blue-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-0.5 text-right">{pct}% repaid</p>
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
