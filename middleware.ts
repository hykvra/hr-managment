import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'esam_token'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/signup',
  '/suspended',
  '/trial-expired',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
]

/** Extract tenant slug from subdomain — e.g. esam.hrjo.in → "esam".
 *  Returns '' on the root domain (hrjo.in) — no default tenant. */
function extractTenantSlug(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  // localhost / dev fallback only
  if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? ''
  }
  return ''
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always inject tenant slug so auth routes (login/register) can resolve it
  const tenantSlug = extractTenantSlug(req.nextUrl.hostname)
  const baseHeaders = new Headers(req.headers)
  baseHeaders.set('x-tenant-slug', tenantSlug)

  // ── Super admin routes (/super-admin/* and /api/super-admin/*) ───────────
  if (pathname.startsWith('/super-admin')) {
    if (pathname === '/super-admin/login') {
      return NextResponse.next({ request: { headers: baseHeaders } })
    }
    const superToken = req.cookies.get('hrjo_super_token')?.value
    if (!superToken) {
      return NextResponse.redirect(new URL('/super-admin/login', req.url))
    }
    try {
      const { payload } = await jwtVerify(superToken, JWT_SECRET)
      if (payload.type !== 'super_admin') throw new Error('not super admin')
      return NextResponse.next({ request: { headers: baseHeaders } })
    } catch {
      const res = NextResponse.redirect(new URL('/super-admin/login', req.url))
      res.cookies.delete('hrjo_super_token')
      return res
    }
  }

  // Super admin API routes self-authenticate via getSuperSession()
  if (pathname.startsWith('/api/super-admin/')) {
    return NextResponse.next({ request: { headers: baseHeaders } })
  }

  // Public API routes — no auth required
  if (pathname.startsWith('/api/public/')) {
    return NextResponse.next({ request: { headers: baseHeaders } })
  }

  // Root domain (no tenant) — only marketing/public routes allowed
  if (!tenantSlug) {
    if (
      PUBLIC_PATHS.includes(pathname) ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/api/public/')
    ) {
      return NextResponse.next({ request: { headers: baseHeaders } })
    }
    // Any tenant-specific route on root domain → back to homepage
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next({ request: { headers: baseHeaders } })
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string

    // Admin routes require manager+ or master_admin
    if (pathname.startsWith('/admin')) {
      if (!['master_admin', 'manager', 'attendance'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      // Attendance role: only /admin/attendance
      if (role === 'attendance' && !pathname.startsWith('/admin/attendance')) {
        return NextResponse.redirect(new URL('/admin/attendance', req.url))
      }
    }

    // Employee dashboard
    if (pathname.startsWith('/dashboard')) {
      if (!['employee', 'manager', 'master_admin'].includes(role)) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
    }

    // Inject user + tenant context into request headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-slug', tenantSlug)
    requestHeaders.set('x-user-id', payload.id as string)
    requestHeaders.set('x-user-role', role)
    requestHeaders.set('x-user-email', payload.email as string)
    if (payload.shift_id) {
      requestHeaders.set('x-user-shift', payload.shift_id as string)
    }
    if (payload.tenant_id) {
      requestHeaders.set('x-tenant-id', payload.tenant_id as string)
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
