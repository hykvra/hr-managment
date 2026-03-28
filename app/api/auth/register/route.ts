import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/mailer'

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
      // Section 4: Documents (Supabase Storage URLs)
      profile_photo,
      // Section 5: Agreed to terms (optional)
    } = body

    // Basic validation
    if (!first_name || !last_name || !email || !password || !dob || !gender || !mobile || !address) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check email uniqueness
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .insert({
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
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, first_name).catch(console.error)

    return NextResponse.json({ success: true, id: employee.id }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
