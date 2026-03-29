import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveTenantId } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, new_password } = await req.json()

    if (!email || !otp || !new_password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Resolve tenant from subdomain slug (injected by middleware)
    const tenantSlug = req.headers.get('x-tenant-slug') ?? (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam')
    const tenantId = await resolveTenantId(tenantSlug)

    const { data: record, error } = await supabaseAdmin
      .from('otp_store')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('otp', otp)
      .eq('tenant_id', tenantId ?? '')
      .single()

    if (error || !record) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    if (new Date(record.expires_at) < new Date()) {
      await supabaseAdmin.from('otp_store').delete().eq('id', record.id)
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(new_password, 12)

    await supabaseAdmin
      .from('employees')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId ?? '')

    await supabaseAdmin.from('otp_store').delete().eq('id', record.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
