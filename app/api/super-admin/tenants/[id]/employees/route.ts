import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET — list employees for a tenant
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, email, role, is_active, employee_code, created_at')
    .eq('tenant_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  return NextResponse.json({ employees: data || [] })
}

// POST — create employee/admin for a tenant
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { first_name, last_name, email, password, role, employee_code } = body

  if (!email?.trim() || !password || !role) {
    return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const validRoles = ['master_admin', 'manager', 'attendance', 'employee']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check email unique within tenant
  const { data: existing } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('tenant_id', params.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'An employee with this email already exists in this tenant' }, { status: 409 })
  }

  // Generate employee code if not provided
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('slug, company_name')
    .eq('id', params.id)
    .single()

  const prefix = tenant?.slug?.toUpperCase().slice(0, 4) || 'EMP'
  const code = employee_code?.trim() || `${prefix}-${Date.now().toString().slice(-5)}`

  const password_hash = await bcrypt.hash(password, 12)

  const { error: empErr } = await supabaseAdmin.from('employees').insert({
    tenant_id: params.id,
    first_name: first_name?.trim() || email.split('@')[0],
    last_name: last_name?.trim() || '',
    email: email.toLowerCase().trim(),
    password_hash,
    role,
    is_active: true,
    employee_code: code,
    base_salary: 0,
    mobile: '0000000000',
    address: tenant?.company_name || '',
    dob: '1990-01-01',
    gender: 'Other',
    joining_date: new Date().toISOString().split('T')[0],
    first_login: true,
  })

  if (empErr) {
    console.error('Create employee error:', empErr.message)
    return NextResponse.json({ error: empErr.message || 'Failed to create employee' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
