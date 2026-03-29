import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all tenants with employee counts
  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })

  // Get employee counts per tenant
  const { data: empCounts } = await supabaseAdmin
    .from('employees')
    .select('tenant_id')
    .eq('is_active', true)
    .not('role', 'in', '("master_admin")')

  const countMap: Record<string, number> = {}
  for (const e of empCounts || []) {
    countMap[e.tenant_id] = (countMap[e.tenant_id] || 0) + 1
  }

  const result = (tenants || []).map(t => ({
    ...t,
    employee_count: countMap[t.id] || 0,
  }))

  return NextResponse.json({ tenants: result })
}

export async function POST(req: NextRequest) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { company_name, slug, plan, max_employees, admin_email, admin_password, admin_name, company_domain } = body

  if (!company_name?.trim() || !slug?.trim() || !admin_email?.trim() || !admin_password) {
    return NextResponse.json({ error: 'company_name, slug, admin_email and admin_password are required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }

  if (admin_password.length < 8) {
    return NextResponse.json({ error: 'Admin password must be at least 8 characters' }, { status: 400 })
  }

  // Check slug uniqueness
  const { data: existing } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug.trim())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })
  }

  // Create tenant
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .insert({
      slug: slug.trim().toLowerCase(),
      company_name: company_name.trim(),
      plan: plan || 'starter',
      status: 'active',
      max_employees: Number(max_employees) || 25,
      ...(company_domain?.trim() ? { company_domain: company_domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '') } : {}),
    })
    .select('id')
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }

  // Create master admin employee for this tenant
  const password_hash = await bcrypt.hash(admin_password, 12)
  const nameParts = (admin_name || admin_email.split('@')[0]).split(' ')
  const first_name = nameParts[0] || 'Admin'
  const last_name = nameParts.slice(1).join(' ') || company_name.trim()

  // Generate a tenant-scoped unique employee code for the master admin
  const adminCode = `${slug.trim().toUpperCase().slice(0, 6)}-ADM`

  const { error: empErr } = await supabaseAdmin.from('employees').insert({
    tenant_id: tenant.id,
    first_name,
    last_name,
    email: admin_email.toLowerCase().trim(),
    password_hash,
    role: 'master_admin',
    is_active: true,
    employee_code: adminCode,
    base_salary: 0,
    mobile: '0000000000',
    address: company_name.trim(),
    dob: '1990-01-01',
    gender: 'Other',
    joining_date: new Date().toISOString().split('T')[0],
    first_login: true,
  })

  if (empErr) {
    // Rollback tenant
    await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 })
  }

  return NextResponse.json({ success: true, tenant_id: tenant.id }, { status: 201 })
}
