import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM-01 — detail mode

  if (month) {
    // Per-employee breakdown for one month
    const { data } = await supabaseAdmin
      .from('payroll_records')
      .select(`
        id, month, base_salary, payable_days, gross_salary,
        penalty_deduction, advance_deduction, bonus, net_salary,
        days_present, days_half, days_double, days_absent, days_uninformed, days_leave,
        status, paid_at, notes,
        employees!employee_id(first_name, last_name, employee_code)
      `)
      .eq('tenant_id', tenantId)
      .eq('month', month)
      .order('employees(first_name)')

    return NextResponse.json({ records: data || [] })
  }

  // Summary: all months with aggregates
  const { data } = await supabaseAdmin
    .from('payroll_records')
    .select('month, net_salary, gross_salary, status')
    .eq('tenant_id', tenantId)
    .order('month', { ascending: false })

  if (!data) return NextResponse.json({ summary: [] })

  // Group by month
  const grouped: Record<string, {
    month: string
    total_gross: number
    total_net: number
    employee_count: number
    paid_count: number
    draft_count: number
  }> = {}

  for (const r of data) {
    const m = r.month as string
    if (!grouped[m]) {
      grouped[m] = { month: m, total_gross: 0, total_net: 0, employee_count: 0, paid_count: 0, draft_count: 0 }
    }
    grouped[m].total_gross += Number(r.gross_salary)
    grouped[m].total_net += Number(r.net_salary)
    grouped[m].employee_count++
    if (r.status === 'paid') grouped[m].paid_count++
    else grouped[m].draft_count++
  }

  return NextResponse.json({ summary: Object.values(grouped) })
}
