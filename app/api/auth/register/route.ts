import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
// bcryptjs v3 compatibility: may ship as ESM with no default export
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/mailer'
import { resolveTenantId } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      // Section 1: Personal
      first_name,
      last_name,
      email,
      password,
      dob,
      gender,
      blood_group,
      mobile,
      address,
      // Section 2: Emergency
      emergency_name,
      emergency_phone,
      // Section 3: Bank
      bank_name,
      account_no,
      ifsc,
      branch_name,
      account_holder,
      // Section 4: Documents (Storage URLs)
      profile_photo,
    } = body

    // Basic validation
    if (!first_name || !last_name || !email || !password || !dob || !gender || !mobile || !address) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Resolve tenant from subdomain slug (injected by middleware)
    const tenantSlug = req.headers.get('x-tenant-slug') ?? (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam')
    const tenantId = await resolveTenantId(tenantSlug)

    if (!tenantId) {
      return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 })
    }

    // Check email uniqueness within tenant
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .insert({
        tenant_id: tenantId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        mobile: mobile.trim(),
        address: address.trim(),
        dob,
        gender,
        blood_group: blood_group || null,
        role: 'employee',
        is_active: false, // Pending admin approval
        first_login: true,
        joining_date: new Date().toISOString().split('T')[0],
        profile_photo: profile_photo || null,
        emergency_name: emergency_name || null,
        emergency_phone: emergency_phone || null,
        bank_name: bank_name || null,
        account_no: account_no || null,
        ifsc: ifsc || null,
        branch_name: branch_name || null,
        account_holder: account_holder || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Register insert error:', error)
      const msg = process.env.NODE_ENV === 'development'
        ? `DB error: ${error.message} [${error.code}]`
        : 'Registration failed. Please try again.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, first_name).catch(console.error)

    return NextResponse.json({ success: true, id: employee.id }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
