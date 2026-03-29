import { NextRequest, NextResponse } from 'next/server'
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'

/** Action → human-readable category for filtering */
const ACTION_CATEGORIES: Record<string, string> = {
  employee_login: 'auth', employee_login_failed: 'auth',
  employee_logout: 'auth', employee_register: 'auth',
  password_reset_otp: 'auth', password_reset_complete: 'auth',
  super_admin_login: 'auth', super_admin_login_failed: 'auth', super_admin_logout: 'auth',
  attendance_saved: 'attendance',
  leave_requested: 'leaves', leave_approved: 'leaves', leave_rejected: 'leaves',
  payroll_generated: 'payroll', payroll_paid: 'payroll',
  employee_approved: 'employees', employee_rejected: 'employees',
  employee_salary_updated: 'employees', employee_deactivated: 'employees',
  employee_reactivated: 'employees',
  advance_requested: 'advances', advance_approved: 'advances', advance_rejected: 'advances',
  resignation_submitted: 'resignation', resignation_withdrawn: 'resignation',
  tenant_created: 'super_admin', tenant_edited: 'super_admin', tenant_deleted: 'super_admin',
  tenant_suspended: 'super_admin', tenant_activated: 'super_admin', super_employee_added: 'super_admin',
}

export async function GET(req: NextRequest) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenant_id   = searchParams.get('tenant_id')
  const category    = searchParams.get('category')   // 'auth' | 'attendance' | 'leaves' | etc.
  const actor_email = searchParams.get('actor_email')
  const date_from   = searchParams.get('date_from')  // ISO date string
  const date_to     = searchParams.get('date_to')
  const limit       = Math.min(Number(searchParams.get('limit') ?? '200'), 500)
  const offset      = Number(searchParams.get('offset') ?? '0')

  // Build action filter from category
  let actions: string[] | null = null
  if (category && category !== 'all') {
    actions = Object.entries(ACTION_CATEGORIES)
      .filter(([, cat]) => cat === category)
      .map(([action]) => action)
    if (actions.length === 0) actions = null
  }

  let query = supabaseAdmin
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenant_id)   query = query.eq('tenant_id', tenant_id)
  if (actor_email) query = query.ilike('actor_email', `%${actor_email}%`)
  if (date_from)   query = query.gte('created_at', date_from)
  if (date_to)     query = query.lte('created_at', date_to + 'T23:59:59Z')
  if (actions)     query = query.in('action', actions)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
