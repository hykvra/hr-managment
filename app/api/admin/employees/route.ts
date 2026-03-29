import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(`
      id, first_name, last_name, email, employee_code, mobile,
      role, is_active, shift_id, base_salary, leave_balance,
      joining_date, profile_photo, created_at,
      shifts!shift_id(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'in', '("master_admin")')
    .order('first_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })

  return NextResponse.json({ employees: data || [] })
}
