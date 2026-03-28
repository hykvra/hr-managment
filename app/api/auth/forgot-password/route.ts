import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOTPEmail } from '@/lib/mailer'
import { generateOTP } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check employee exists
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return success to prevent email enumeration
    if (!employee) {
      return NextResponse.json({ success: true })
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Delete any existing OTPs for this email
    await supabaseAdmin.from('otp_store').delete().eq('email', email.toLowerCase().trim())

    // Store new OTP
    await supabaseAdmin.from('otp_store').insert({
      email: email.toLowerCase().trim(),
      otp,
      expires_at: expiresAt,
    })

    await sendOTPEmail(email, otp)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
