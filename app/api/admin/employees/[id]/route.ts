import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/mailer'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'approve') {
    const { employee_code, base_salary, shift_id, monthly_leave_quota } = body

    if (!employee_code?.trim()) {
      return NextResponse.json({ error: 'Employee code is required' }, { status: 400 })
    }
    if (!base_salary || Number(base_salary) <= 0) {
      return NextResponse.json({ error: 'Valid base salary is required' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('employee_code', employee_code.trim())
      .neq('id', params.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Employee code already in use' }, { status: 400 })
    }

    const { data: emp, error } = await supabaseAdmin
      .from('employees')
      .update({
        is_active: true,
        employee_code: employee_code.trim(),
        base_salary: Number(base_salary),
        shift_id: shift_id || null,
        monthly_leave_quota: Number(monthly_leave_quota) || 1.5,
        joining_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', params.id)
      .select('email, first_name')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to approve employee' }, { status: 500 })

    try {
      if (emp) await sendWelcomeEmail(emp.email, emp.first_name)
    } catch { /* non-critical — portal still activated */ }

    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: 'Failed to reject registration' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Actions for existing active employees ────────────────────────────────

  if (action === 'salary_update') {
    const { new_salary, message } = body
    if (!new_salary || Number(new_salary) <= 0) {
      return NextResponse.json({ error: 'Valid salary is required' }, { status: 400 })
    }

    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('base_salary')
      .eq('id', params.id)
      .single()

    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const today = new Date().toISOString().split('T')[0]

    const [{ error: updateErr }, { error: histErr }] = await Promise.all([
      supabaseAdmin.from('employees').update({
        base_salary: Number(new_salary),
        increment_message: message?.trim() || null,
      }).eq('id', params.id),
      supabaseAdmin.from('salary_history').insert({
        employee_id: params.id,
        old_salary: Number(emp.base_salary),
        new_salary: Number(new_salary),
        start_month: today,
      }),
    ])

    if (updateErr || histErr) {
      return NextResponse.json({ error: 'Failed to update salary' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'add_bonus') {
    const { amount, reason, bonus_month } = body
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid bonus amount is required' }, { status: 400 })
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const month = bonus_month || new Date().toISOString().split('T')[0]

    const [{ error: bonusErr }, { error: msgErr }] = await Promise.all([
      supabaseAdmin.from('bonus_history').insert({
        employee_id: params.id,
        amount: Number(amount),
        reason: reason.trim(),
        bonus_month: month,
      }),
      supabaseAdmin.from('employees').update({
        bonus_message: `₹${Number(amount).toLocaleString('en-IN')} bonus — ${reason.trim()}`,
      }).eq('id', params.id),
    ])

    if (bonusErr || msgErr) {
      return NextResponse.json({ error: 'Failed to add bonus' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'shift_change') {
    const { shift_id } = body
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ shift_id: shift_id || null })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: 'Failed to change shift' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deactivate') {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ is_active: false })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'reactivate') {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ is_active: true })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: 'Failed to reactivate employee' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
