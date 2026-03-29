import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  const status     = searchParams.get('status') // 'active' | 'cleared' | 'cancelled' | all

  let query = supabaseAdmin
    .from('employee_loans')
    .select(`
      id, amount, reason, emi_amount, disbursed_on,
      months_total, months_paid, status, created_at,
      employees!employee_id(first_name, last_name, employee_code)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })

  return NextResponse.json({ loans: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { employee_id, amount, reason, emi_amount, months_total, disbursed_on } =
    await req.json() as {
      employee_id: string
      amount: number
      reason: string
      emi_amount: number
      months_total: number
      disbursed_on?: string
    }

  if (!employee_id || !amount || !reason?.trim() || !emi_amount || !months_total) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (Number(amount) <= 0 || Number(emi_amount) <= 0 || Number(months_total) < 1) {
    return NextResponse.json({ error: 'Invalid values' }, { status: 400 })
  }

  // Verify employee belongs to this tenant
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name')
    .eq('id', employee_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { data: loan, error } = await supabaseAdmin
    .from('employee_loans')
    .insert({
      tenant_id: tenantId,
      employee_id,
      amount: Number(amount),
      reason: reason.trim(),
      emi_amount: Number(emi_amount),
      months_total: Number(months_total),
      disbursed_on: disbursed_on || new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })

  await activityLog({
    action: 'loan_created',
    tenant_id: tenantId,
    actor_id: session.id,
    actor_email: session.email,
    actor_role: session.role,
    entity_type: 'loan',
    entity_id: loan?.id,
    entity_name: `${emp.first_name} ${emp.last_name}`,
    details: { amount, emi_amount, months_total },
  })

  return NextResponse.json({ success: true, id: loan?.id })
}
