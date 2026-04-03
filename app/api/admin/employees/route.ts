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
      department, employment_type, pf_enabled, esi_enabled,
      shifts!shift_id(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'in', '("master_admin")')
    .order('first_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })

  return NextResponse.json({ employees: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json() as {
    first_name: string; last_name: string; email: string; mobile: string
    address: string; dob: string; gender: string; joining_date: string
    base_salary: number; employee_code?: string; role?: string
    shift_id?: string; department?: string
  }

  const { first_name, last_name, email, mobile, address, dob, gender, joining_date, base_salary } = body
  if (!first_name || !last_name || !email || !mobile || !address || !dob || !gender || !joining_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Hash default password
  const bcrypt = await import('bcryptjs')
  const password_hash = await bcrypt.hash('Esam@1234', 10)

  const { data, error } = await supabaseAdmin.from('employees').insert({
    tenant_id: tenantId,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.toLowerCase().trim(),
    password_hash,
    mobile,
    address,
    dob,
    gender,
    joining_date,
    base_salary: base_salary || 0,
    leave_balance: 0,
    monthly_leave_quota: 1.5,
    role: body.role || 'employee',
    employee_code: body.employee_code?.trim() || null,
    shift_id: body.shift_id || null,
    department: body.department || null,
    is_active: true,
    first_login: true,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}
