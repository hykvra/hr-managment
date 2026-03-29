import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { action, month } = await req.json() as { action: string; month?: string }

  // Fetch current loan
  const { data: loan } = await supabaseAdmin
    .from('employee_loans')
    .select('id, employee_id, months_total, months_paid, emi_amount, status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  if (loan.status !== 'active' && action !== 'cancel') {
    return NextResponse.json({ error: 'Loan is not active' }, { status: 400 })
  }

  if (action === 'record_payment') {
    const paymentMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    // Check for duplicate payment this month
    const { data: existing } = await supabaseAdmin
      .from('loan_payments')
      .select('id')
      .eq('loan_id', params.id)
      .eq('month', paymentMonth)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'EMI already recorded for this month' }, { status: 400 })
    }

    const newPaid = loan.months_paid + 1
    const isDone  = newPaid >= loan.months_total
    const newStatus = isDone ? 'cleared' : 'active'

    await Promise.all([
      supabaseAdmin.from('loan_payments').insert({
        loan_id: params.id,
        tenant_id: tenantId,
        employee_id: loan.employee_id,
        month: paymentMonth,
        amount: loan.emi_amount,
      }),
      supabaseAdmin.from('employee_loans')
        .update({ months_paid: newPaid, status: newStatus })
        .eq('id', params.id),
    ])

    await activityLog({
      action: 'loan_emi_paid',
      tenant_id: tenantId,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'loan',
      entity_id: params.id,
      details: { month: paymentMonth, months_paid: newPaid, cleared: isDone },
    })

    return NextResponse.json({ success: true, cleared: isDone })
  }

  if (action === 'cancel') {
    const { error } = await supabaseAdmin
      .from('employee_loans')
      .update({ status: 'cancelled' })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: 'Failed to cancel loan' }, { status: 500 })

    await activityLog({
      action: 'loan_cancelled',
      tenant_id: tenantId,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'loan',
      entity_id: params.id,
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
