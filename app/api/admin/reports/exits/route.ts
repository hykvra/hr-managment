import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const currentYear = now.getFullYear()
  const defaultFrom = `${currentYear}-01-01`
  const defaultTo = `${currentYear}-12-31`

  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo

  // Employees who resigned (have resignation_date in range) OR were deactivated
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, first_name, last_name, email, mobile, employee_code, role,
      joining_date, base_salary, gender, is_active,
      resignation_status, resignation_date, last_working_date,
      shifts(name)
    `)
    .eq('tenant_id', tenantId)
    .not('role', 'in', '("master_admin")')
    .or(`and(resignation_status.eq.true,resignation_date.gte.${from},resignation_date.lte.${to}),is_active.eq.false`)
    .order('resignation_date', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch exit report' }, { status: 500 })
  return NextResponse.json({ employees: data || [], from, to })
}
