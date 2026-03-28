'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Save, CheckCircle, Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type PayrollRecord = {
  record_id: string | null
  employee_id: string
  first_name: string
  last_name: string
  employee_code: string | null
  base_salary: number
  days_present: number
  days_half: number
  days_double: number
  days_absent: number
  days_uninformed: number
  days_leave: number
  payable_days: number
  gross_salary: number
  penalty_deduction: number
  advance_deduction: number
  bonus: number
  net_salary: number
  status: string
  paid_at: string | null
  notes: string | null
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function fmtMoney(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function buildPayslipHtml(r: PayrollRecord, month: string): string {
  const [year, mon] = month.split('-')
  const monthLabel = `${MONTHS[Number(mon) - 1]} ${year}`
  const daily = r.base_salary / 30

  return [
    '<!DOCTYPE html><html><head><title>Payslip</title>',
    '<style>',
    '@page{size:A5 landscape;margin:12mm}',
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}',
    '.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}',
    '.header h1{font-size:18px;font-weight:bold}',
    '.header h2{font-size:12px;margin-top:3px;letter-spacing:3px;color:#444}',
    '.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #ddd}',
    '.label{color:#555}',
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}',
    '.box{background:#f5f5f5;padding:8px;border-radius:4px}',
    '.box-label{font-size:9px;color:#888;margin-bottom:2px}',
    '.box-value{font-size:13px;font-weight:bold}',
    '.net-box{font-size:22px;font-weight:bold;text-align:center;padding:12px;border:2px solid #000;margin:14px 0;border-radius:4px}',
    '.sigs{display:flex;justify-content:space-between;margin-top:24px}',
    '.sig{text-align:center}.sig-line{border-top:1px solid #000;width:120px;margin:0 auto 4px}',
    '.sig-label{font-size:10px;color:#555}',
    '</style></head><body>',
    '<div class="header"><h1>ESAM HR Portal</h1><h2>SALARY PAYSLIP — ' + monthLabel.toUpperCase() + '</h2></div>',
    '<div class="row"><span class="label">Employee</span><strong>' + r.first_name + ' ' + r.last_name + '</strong></div>',
    '<div class="row"><span class="label">Employee Code</span><span>' + (r.employee_code || '—') + '</span></div>',
    '<div class="row"><span class="label">Base Salary</span><span>₹' + Math.round(r.base_salary).toLocaleString('en-IN') + '</span></div>',
    '<div class="row"><span class="label">Daily Rate</span><span>₹' + Math.round(daily).toLocaleString('en-IN') + '</span></div>',
    '<div class="grid">',
    '<div class="box"><div class="box-label">Present</div><div class="box-value">' + r.days_present + '</div></div>',
    '<div class="box"><div class="box-label">Half Day</div><div class="box-value">' + r.days_half + '</div></div>',
    '<div class="box"><div class="box-label">Double Shift</div><div class="box-value">' + r.days_double + '</div></div>',
    '<div class="box"><div class="box-label">Approved Leave</div><div class="box-value">' + r.days_leave + '</div></div>',
    '<div class="box"><div class="box-label">Absent</div><div class="box-value">' + r.days_absent + '</div></div>',
    '<div class="box"><div class="box-label">Uninformed</div><div class="box-value" style="color:#dc2626">' + r.days_uninformed + '</div></div>',
    '</div>',
    '<div class="row"><span class="label">Payable Days</span><span>' + r.payable_days + '</span></div>',
    '<div class="row"><span class="label">Gross Salary</span><span>₹' + Math.round(r.gross_salary).toLocaleString('en-IN') + '</span></div>',
    r.penalty_deduction > 0 ? '<div class="row"><span class="label">Uninformed Penalty</span><span style="color:#dc2626">−₹' + Math.round(r.penalty_deduction).toLocaleString('en-IN') + '</span></div>' : '',
    r.advance_deduction > 0 ? '<div class="row"><span class="label">Advance Deduction</span><span style="color:#d97706">−₹' + Math.round(r.advance_deduction).toLocaleString('en-IN') + '</span></div>' : '',
    r.bonus > 0 ? '<div class="row"><span class="label">Bonus</span><span style="color:#16a34a">+₹' + Math.round(r.bonus).toLocaleString('en-IN') + '</span></div>' : '',
    '<div class="net-box">Net Pay: ₹' + Math.round(r.net_salary).toLocaleString('en-IN') + '</div>',
    r.notes ? '<div class="row"><span class="label">Notes</span><span>' + r.notes + '</span></div>' : '',
    '<div class="sigs">',
    '<div class="sig"><div class="sig-line"></div><div class="sig-label">Authorized Signature</div></div>',
    '<div class="sig"><div class="sig-line"></div><div class="sig-label">Employee Signature</div></div>',
    '</div>',
    '</body></html>',
  ].join('')
}

function printPayslip(r: PayrollRecord, month: string) {
  const html = buildPayslipHtml(r, month)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url) } }
  else URL.revokeObjectURL(url)
}

export function PayrollRun() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [mon, setMon] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [adjustments, setAdjustments] = useState<Record<string, { bonus: string; notes: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [calculated, setCalculated] = useState(false)

  const monthStr = `${year}-${String(mon).padStart(2, '0')}`

  function changeMonth(delta: number) {
    let m = mon + delta, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMon(m); setYear(y)
    setRecords([]); setCalculated(false)
  }

  async function calculate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payroll?month=${monthStr}`)
      if (res.ok) {
        const { records: data } = await res.json() as { records: PayrollRecord[] }
        setRecords(data)
        const adj: Record<string, { bonus: string; notes: string }> = {}
        for (const r of data) {
          adj[r.employee_id] = {
            bonus: r.bonus > 0 ? String(r.bonus) : '',
            notes: r.notes || '',
          }
        }
        setAdjustments(adj)
        setCalculated(true)
      }
    } finally {
      setLoading(false)
    }
  }

  function getAdjustedRecord(r: PayrollRecord): PayrollRecord {
    const adj = adjustments[r.employee_id] || { bonus: '', notes: '' }
    const bonus = Number(adj.bonus) || 0
    const net = Math.max(0, r.gross_salary - r.penalty_deduction - r.advance_deduction + bonus)
    return { ...r, bonus, net_salary: Math.round(net * 100) / 100, notes: adj.notes || null }
  }

  async function savePayroll() {
    setSaving(true)
    try {
      const adjusted = records.map(getAdjustedRecord)
      const res = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthStr, records: adjusted }),
      })
      if (res.ok) {
        await calculate()
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function markPaid(recordId: string) {
    setMarkingId(recordId)
    try {
      await fetch(`/api/admin/payroll/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      await calculate()
      router.refresh()
    } finally {
      setMarkingId(null)
    }
  }

  const totalNet = records.reduce((s, r) => s + getAdjustedRecord(r).net_salary, 0)
  const paidCount = records.filter(r => r.status === 'paid').length

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white text-sm font-semibold w-36 text-center">
            {MONTHS[mon - 1]} {year}
          </span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={() => changeMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
          onClick={calculate} disabled={loading}>
          <Calculator className="w-3.5 h-3.5" />
          {loading ? 'Calculating…' : calculated ? 'Recalculate' : 'Calculate Payroll'}
        </Button>
        {calculated && records.length > 0 && (
          <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1"
            onClick={savePayroll} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save Payroll'}
          </Button>
        )}
        {calculated && records.length > 0 && (
          <div className="ml-auto flex items-center gap-4">
            <span className="text-zinc-400 text-xs">{paidCount}/{records.length} paid</span>
            <span className="text-white text-sm font-bold">Total: {fmtMoney(totalNet)}</span>
          </div>
        )}
      </div>

      {!calculated && !loading && (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
          Select a month and click Calculate Payroll
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Calculating…</div>
      )}

      {calculated && records.length === 0 && (
        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">No active employees found</div>
      )}

      {/* Records table */}
      {calculated && records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Employee','P','H','D','U','L','A','Base','Payable','Gross','Penalty','Advance','Bonus','Net','Status',''].map(h => (
                  <th key={h} className="text-left text-zinc-500 font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {records.map(r => {
                const adj = getAdjustedRecord(r)
                const isPaid = r.status === 'paid'
                return (
                  <tr key={r.employee_id} className={`${isPaid ? 'opacity-60' : ''}`}>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="text-white font-medium">{r.first_name} {r.last_name}</span>
                      {r.employee_code && <span className="text-zinc-500 ml-1 font-mono">#{r.employee_code}</span>}
                    </td>
                    <td className="py-2 pr-3 text-green-400">{r.days_present}</td>
                    <td className="py-2 pr-3 text-yellow-400">{r.days_half}</td>
                    <td className="py-2 pr-3 text-blue-400">{r.days_double}</td>
                    <td className="py-2 pr-3 text-red-400">{r.days_uninformed}</td>
                    <td className="py-2 pr-3 text-purple-400">{r.days_leave}</td>
                    <td className="py-2 pr-3 text-zinc-500">{r.days_absent}</td>
                    <td className="py-2 pr-3 text-zinc-300">{fmtMoney(r.base_salary)}</td>
                    <td className="py-2 pr-3 text-zinc-300">{adj.payable_days}</td>
                    <td className="py-2 pr-3 text-zinc-300">{fmtMoney(adj.gross_salary)}</td>
                    <td className="py-2 pr-3 text-red-400">{adj.penalty_deduction > 0 ? `−${fmtMoney(adj.penalty_deduction)}` : '—'}</td>
                    <td className="py-2 pr-3 text-yellow-400">{adj.advance_deduction > 0 ? `−${fmtMoney(adj.advance_deduction)}` : '—'}</td>
                    <td className="py-2 pr-3">
                      {isPaid ? (
                        <span className="text-green-400">{adj.bonus > 0 ? `+${fmtMoney(adj.bonus)}` : '—'}</span>
                      ) : (
                        <Input
                          type="number"
                          placeholder="0"
                          value={adjustments[r.employee_id]?.bonus || ''}
                          onChange={e => setAdjustments(a => ({ ...a, [r.employee_id]: { ...a[r.employee_id], bonus: e.target.value } }))}
                          className="h-6 w-20 text-xs bg-zinc-700 border-zinc-600 text-white p-1"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`font-bold ${isPaid ? 'text-green-400' : 'text-white'}`}>
                        {fmtMoney(adj.net_salary)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {isPaid ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                          Paid
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-1">
                      <div className="flex items-center gap-1">
                        {isPaid && (
                          <Button size="sm" variant="outline"
                            className="h-6 text-[10px] px-2 border-zinc-700 gap-1"
                            onClick={() => printPayslip(r, monthStr)}>
                            <Printer className="w-3 h-3" /> Print
                          </Button>
                        )}
                        {!isPaid && r.record_id && (
                          <Button size="sm"
                            className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 gap-1"
                            disabled={markingId === r.record_id}
                            onClick={() => markPaid(r.record_id!)}>
                            <CheckCircle className="w-3 h-3" />
                            {markingId === r.record_id ? '…' : 'Paid'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
