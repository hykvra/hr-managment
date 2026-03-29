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
  const status = searchParams.get('status') || 'active'
  const search = searchParams.get('search')?.toLowerCase() || ''

  let query = supabaseAdmin
    .from('employees')
    .select(`
      id, first_name, last_name, email, mobile, employee_code, role,
      joining_date, base_salary, leave_balance, gender, dob, blood_group,
      address, bank_name, account_no, ifsc, branch_name, account_holder,
      emergency_name, emergency_phone, is_active, resignation_status,
      resignation_date, last_working_date, created_at,
      shifts(name)
    `)
    .eq('tenant_id', tenantId)
    .not('role', 'in', '("master_admin")')
    .order('first_name')

  if (status === 'active') query = query.eq('is_active', true)
  else if (status === 'inactive') query = query.eq('is_active', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })

  let employees = data || []
  if (search) {
    employees = employees.filter(e => {
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
      return (
        fullName.includes(search) ||
        e.email.toLowerCase().includes(search) ||
        (e.employee_code?.toLowerCase() || '').includes(search)
      )
    })
  }

  return NextResponse.json({ employees })
}
