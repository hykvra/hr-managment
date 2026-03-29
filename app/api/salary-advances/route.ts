import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { amount, reason } = body

  if (!amount || !reason?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const parsedAmount = Number(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  // Get employee base salary
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('base_salary')
    .eq('id', session.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const maxAdvance = Number(employee.base_salary) * 0.5
  if (parsedAmount > maxAdvance) {
    return NextResponse.json(
      { error: `Maximum advance allowed is ₹${maxAdvance.toLocaleString('en-IN')}` },
      { status: 400 }
    )
  }

  // Check for existing pending advance
  const { data: pending } = await supabaseAdmin
    .from('salary_advances')
    .select('id')
    .eq('employee_id', session.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    return NextResponse.json({ error: 'You already have a pending advance request' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('salary_advances').insert({
    tenant_id: tenantId,
    employee_id: session.id,
    amount: parsedAmount,
    reason: reason.trim(),
  })

  if (error) return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })

  return NextResponse.json({ success: true })
}
