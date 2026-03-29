import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOTPEmail } from '@/lib/mailer'
import { generateOTP } from '@/lib/utils'
import { resolveTenantId } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Resolve tenant from subdomain slug (injected by middleware)
    const tenantSlug = req.headers.get('x-tenant-slug') ?? (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam')
    const tenantId = await resolveTenantId(tenantSlug)

    // Check employee exists within this tenant
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId ?? '')
      .single()

    // Always return success to prevent email enumeration
    if (!employee) {
      return NextResponse.json({ success: true })
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Delete any existing OTPs for this email + tenant
    await supabaseAdmin
      .from('otp_store')
      .delete()
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId ?? '')

    // Store new OTP
    await supabaseAdmin.from('otp_store').insert({
      email: email.toLowerCase().trim(),
      otp,
      expires_at: expiresAt,
      tenant_id: tenantId,
    })

    await sendOTPEmail(email, otp)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Forgot password error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
