import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('id, email, password_hash, role, shift_id, is_active, first_login')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!employee.is_active) {
      return NextResponse.json(
        { error: 'Your account is pending admin approval' },
        { status: 403 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, employee.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signToken({
      id: employee.id,
      role: employee.role,
      shift_id: employee.shift_id,
      email: employee.email,
    })

    const cookieOpts = setAuthCookie(token) as {
      name: string
      value: string
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax'
      maxAge: number
      path: string
    }

    const response = NextResponse.json({
      success: true,
      role: employee.role,
      first_login: employee.first_login,
    })

    response.cookies.set(cookieOpts)

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
