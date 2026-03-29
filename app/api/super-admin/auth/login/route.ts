import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signSuperToken, setSuperAuthCookie } from '@/lib/super-auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: admin, error } = await supabaseAdmin
      .from('super_admins')
      .select('id, email, password_hash, name')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, admin.password_hash)
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signSuperToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'super_admin',
    })

    const cookieOpts = setSuperAuthCookie(token) as {
      name: string; value: string; httpOnly: boolean
      secure: boolean; sameSite: 'lax'; maxAge: number; path: string
    }
    const response = NextResponse.json({ success: true })
    response.cookies.set(cookieOpts)
    return response
  } catch (err) {
    console.error('Super admin login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
