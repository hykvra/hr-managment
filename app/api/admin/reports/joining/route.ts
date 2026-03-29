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
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, first_name, last_name, email, mobile, employee_code, role,
      joining_date, base_salary, gender, is_active, profile_photo,
      shifts(name)
    `)
    .eq('tenant_id', tenantId)
    .not('role', 'in', '("master_admin")')
    .gte('joining_date', from)
    .lte('joining_date', to)
    .order('joining_date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch joining report' }, { status: 500 })
  return NextResponse.json({ employees: data || [], from, to })
}
