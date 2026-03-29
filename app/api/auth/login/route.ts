import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bcrypt = (bcryptjs as any).default ?? bcryptjs
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, setAuthCookie } from '@/lib/auth'
import { resolveTenantId } from '@/lib/tenant'
import { getSubscriptionInfo } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Resolve tenant from subdomain slug (injected by middleware)
    const rawSlug = req.headers.get('x-tenant-slug')
    const tenantSlug = rawSlug && rawSlug.trim() !== '' ? rawSlug.trim() : (process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? '')
    console.log('[login] host:', req.headers.get('host'), '| x-tenant-slug:', rawSlug, '| resolved slug:', tenantSlug)
    const tenantId = await resolveTenantId(tenantSlug)
    console.log('[login] tenantId:', tenantId)

    if (!tenantId) {
      return NextResponse.json({ error: 'Unknown workspace. Check your portal URL.' }, { status: 400 })
    }

    // ── Subscription gate ─────────────────────────────────────────────────────
    const { data: tenantRecord } = await supabaseAdmin
      .from('tenants')
      .select('plan, status, max_employees, trial_ends_at')
      .eq('id', tenantId)
      .single()

    if (tenantRecord) {
      const subInfo = getSubscriptionInfo(tenantRecord)
      if (subInfo.status === 'suspended') {
        return NextResponse.json(
          { error: 'This workspace has been suspended. Contact support@hrjo.in to resolve.' },
          { status: 403 },
        )
      }
      if (subInfo.status === 'trial_expired') {
        return NextResponse.json(
          { error: 'Your free trial has expired. Contact support@hrjo.in to upgrade and restore access.' },
          { status: 403 },
        )
      }
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('id, email, password_hash, role, shift_id, is_active, first_login')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId)
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
      tenant_id: tenantId,
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
