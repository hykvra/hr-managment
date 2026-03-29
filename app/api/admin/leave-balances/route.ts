import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const year = new Date().getFullYear()

  const { data, error } = await supabaseAdmin
    .from('employee_leave_balances')
    .select(`
      *,
      employees!inner(first_name, last_name, employee_code, is_active),
      leave_types!inner(name, color, annual_quota)
    `)
    .eq('tenant_id', tenantId)
    .eq('year', year)
    .eq('employees.is_active', true)
    .order('employees(first_name)')

  if (error) return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 })
  return NextResponse.json({ balances: data || [], year })
}

// Seed balances for all active employees + all leave types for current year
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { year: inputYear } = await req.json().catch(() => ({}))
  const year = inputYear ?? new Date().getFullYear()

  // Get all active employees
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  // Get all active leave types
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('id, annual_quota')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!employees?.length || !leaveTypes?.length) {
    return NextResponse.json({ seeded: 0 })
  }

  const rows = employees.flatMap(emp =>
    leaveTypes.map(lt => ({
      tenant_id: tenantId,
      employee_id: emp.id,
      leave_type_id: lt.id,
      year,
      opening_balance: 0,
      accrued: Number(lt.annual_quota),
      used: 0,
      carry_forward: 0,
    }))
  )

  const { error } = await supabaseAdmin
    .from('employee_leave_balances')
    .upsert(rows, { onConflict: 'employee_id,leave_type_id,year', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: 'Failed to seed balances' }, { status: 500 })
  return NextResponse.json({ seeded: rows.length })
}
