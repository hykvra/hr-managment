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
    .select('id, first_name, last_name, employee_code, email, mobile, department, shift_id, resignation_date, last_working_date, is_active, shifts(name)')
    .eq('tenant_id', tenantId)
    .eq('resignation_status', true)
    .order('resignation_date', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to fetch resignations' }, { status: 500 })
  return NextResponse.json({ resignations: data || [] })
}
