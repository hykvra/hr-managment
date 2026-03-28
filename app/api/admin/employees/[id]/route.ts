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

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
