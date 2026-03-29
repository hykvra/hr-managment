import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs
import { supabaseAdmin } from '@/lib/supabase'
import { sendTenantWelcomeEmail } from '@/lib/mailer'

const RESERVED_SLUGS = [
  'www', 'app', 'api', 'admin', 'super', 'dashboard', 'mail', 'ftp',
  'smtp', 'pop', 'imap', 'blog', 'docs', 'help', 'support', 'status',
  'static', 'cdn', 'assets', 'login', 'signup', 'register', 'auth',
  'billing', 'account', 'settings', 'hrjo', 'esam',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_name, slug, plan, admin_name, admin_email, admin_password } = body

    // ── Validation ────────────────────────────────────────────────────────────
    if (!company_name?.trim() || !slug?.trim() || !admin_email?.trim() || !admin_password || !admin_name?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 },
      )
    }

    const cleanSlug = slug.toLowerCase().trim()

    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers and hyphens only' },
        { status: 400 },
      )
    }

    if (cleanSlug.length < 3 || cleanSlug.length > 30) {
      return NextResponse.json({ error: 'Slug must be 3–30 characters' }, { status: 400 })
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return NextResponse.json({ error: 'This subdomain is reserved' }, { status: 400 })
    }

    if (admin_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const allowedPlans = ['starter', 'pro', 'enterprise']
    const selectedPlan = allowedPlans.includes(plan) ? plan : 'starter'

    // ── Slug uniqueness check ─────────────────────────────────────────────────
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (existingTenant) {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }

    // ── Email uniqueness check (cross-tenant) ─────────────────────────────────
    // We don't check cross-tenant because each tenant is isolated.
    // But check within employees for safety on the pending new tenant.

    // ── Create tenant ─────────────────────────────────────────────────────────
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30)

    const maxEmployeesMap: Record<string, number> = {
      starter: 25,
      pro: 100,
      enterprise: 500,
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        slug: cleanSlug,
        company_name: company_name.trim(),
        plan: selectedPlan,
        status: 'trial',
        max_employees: maxEmployeesMap[selectedPlan],
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select('id')
      .single()

    if (tenantErr || !tenant) {
      console.error('Tenant creation error:', tenantErr)
      return NextResponse.json({ error: 'Failed to create your workspace' }, { status: 500 })
    }

    // ── Create master admin employee ──────────────────────────────────────────
    const password_hash = await bcrypt.hash(admin_password, 12)
    const nameParts = admin_name.trim().split(' ')
    const first_name = nameParts[0]
    const last_name = nameParts.slice(1).join(' ') || company_name.trim()

    const { error: empErr } = await supabaseAdmin.from('employees').insert({
      tenant_id: tenant.id,
      first_name,
      last_name,
      email: admin_email.toLowerCase().trim(),
      password_hash,
      role: 'master_admin',
      is_active: true,
      employee_code: 'ADM001',
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
      console.error('Employee creation error:', empErr)
      return NextResponse.json({ error: 'Failed to create admin account' }, { status: 500 })
    }

    // ── Send welcome email (best-effort) ──────────────────────────────────────
    try {
      await sendTenantWelcomeEmail(
        admin_email.toLowerCase().trim(),
        admin_name.trim(),
        company_name.trim(),
        cleanSlug,
      )
    } catch (mailErr) {
      console.error('Welcome email failed (non-fatal):', mailErr)
    }

    return NextResponse.json({ success: true, slug: cleanSlug }, { status: 201 })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
