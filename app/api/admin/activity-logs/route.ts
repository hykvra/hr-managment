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
  const category = searchParams.get('category') || 'all'
  const dateFrom = searchParams.get('date_from')
  const dateTo   = searchParams.get('date_to')
  const limit    = Math.min(Number(searchParams.get('limit') || '100'), 500)
  const offset   = Number(searchParams.get('offset') || '0')

  const ACTION_CATEGORIES: Record<string, string[]> = {
    auth:        ['employee_login', 'employee_login_failed', 'employee_logout', 'employee_register', 'password_reset_otp', 'password_reset_complete'],
    attendance:  ['attendance_saved'],
    leaves:      ['leave_requested', 'leave_approved', 'leave_rejected'],
    payroll:     ['payroll_generated', 'payroll_paid'],
    employees:   ['employee_approved', 'employee_rejected', 'employee_salary_updated', 'employee_deactivated', 'employee_reactivated', 'employee_details_updated'],
    advances:    ['advance_requested', 'advance_approved', 'advance_rejected'],
    loans:       ['loan_created', 'loan_emi_paid', 'loan_cancelled'],
    expenses:    [],
    warnings:    [],
    resignation: ['resignation_submitted', 'resignation_withdrawn'],
  }

  let query = supabaseAdmin
    .from('activity_logs')
    .select('id, actor_email, actor_role, action, entity_type, entity_name, details, created_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category !== 'all' && ACTION_CATEGORIES[category]) {
    query = query.in('action', ACTION_CATEGORIES[category])
  }
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo)   query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })

  return NextResponse.json({ logs: data || [], total: count || 0 })
}
