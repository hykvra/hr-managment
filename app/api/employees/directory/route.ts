import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, department, profile_photo, shift_id, joining_date, shifts(name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'in', '("master_admin","manager","attendance")')
    .order('first_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 })
  return NextResponse.json({ employees: data || [] })
}
