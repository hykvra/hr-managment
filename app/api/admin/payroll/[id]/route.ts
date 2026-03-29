import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { activityLog } from '@/lib/activity-logger'
import { sendPayslipEmail } from '@/lib/mailer'

const ALLOWED = ['master_admin', 'manager']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { action } = await req.json() as { action: string }

  if (action === 'mark_paid') {
    const { data: record, error } = await supabaseAdmin
      .from('payroll_records')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select(`
        id, month, employee_id,
        base_salary, days_present, days_half, days_double,
        days_absent, days_uninformed, days_leave, payable_days,
        gross_salary, total_allowances, penalty_deduction, advance_deduction,
        loan_deduction, total_component_deductions,
        pf_employee, esi_employee, pf_employer, ot_pay, bonus, net_salary, notes,
        employees!employee_id(first_name, last_name, email, employee_code)
      `)
      .single()

    if (error || !record) {
      return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 })
    }

    // Record loan EMI payment if there is a loan_deduction on this record
    const loanDeduction = Number(record.loan_deduction || 0)
    if (loanDeduction > 0) {
      const { data: activeLoan } = await supabaseAdmin
        .from('employee_loans')
        .select('id, months_total, months_paid, emi_amount')
        .eq('tenant_id', tenantId)
        .eq('employee_id', record.employee_id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (activeLoan) {
        const newPaid  = activeLoan.months_paid + 1
        const isDone   = newPaid >= activeLoan.months_total
        const payMonth = String(record.month).slice(0, 7) + '-01'

        await Promise.all([
          supabaseAdmin.from('loan_payments').upsert({
            loan_id: activeLoan.id,
            tenant_id: tenantId,
            employee_id: record.employee_id,
            month: payMonth,
            amount: activeLoan.emi_amount,
          }, { onConflict: 'loan_id,month', ignoreDuplicates: true }),
          supabaseAdmin.from('employee_loans')
            .update({ months_paid: newPaid, status: isDone ? 'cleared' : 'active' })
            .eq('id', activeLoan.id),
        ])
      }
    }

    // Send payslip email (non-critical)
    try {
      const empRaw = record.employees as unknown
      const emp = empRaw as {
        first_name: string; last_name: string; email: string; employee_code: string | null
      }
      if (emp?.email) {
        await sendPayslipEmail(emp.email, emp.first_name, {
          month:                      String(record.month),
          base_salary:                Number(record.base_salary),
          days_present:               Number(record.days_present),
          days_half:                  Number(record.days_half),
          days_double:                Number(record.days_double),
          days_absent:                Number(record.days_absent),
          days_uninformed:            Number(record.days_uninformed),
          days_leave:                 Number(record.days_leave),
          payable_days:               Number(record.payable_days),
          gross_salary:               Number(record.gross_salary),
          total_allowances:           Number(record.total_allowances           || 0),
          penalty_deduction:          Number(record.penalty_deduction),
          advance_deduction:          Number(record.advance_deduction),
          loan_deduction:             Number(record.loan_deduction             || 0),
          total_component_deductions: Number(record.total_component_deductions || 0),
          pf_employee:                Number(record.pf_employee                || 0),
          esi_employee:               Number(record.esi_employee               || 0),
          pf_employer:                Number(record.pf_employer                || 0),
          ot_pay:                     Number(record.ot_pay                     || 0),
          bonus:                      Number(record.bonus),
          net_salary:                 Number(record.net_salary),
          notes:                      record.notes as string | null,
        })
      }
    } catch (emailErr) {
      console.error('[payroll] payslip email failed:', emailErr)
    }

    await activityLog({
      action: 'payroll_paid',
      tenant_id: tenantId,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      entity_type: 'payroll_record',
      entity_id: params.id,
      details: { month: record.month },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
