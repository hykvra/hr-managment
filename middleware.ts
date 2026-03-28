import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'esam_token'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and static files
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
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

    // Inject user info into request headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', payload.id as string)
    requestHeaders.set('x-user-role', role)
    requestHeaders.set('x-user-email', payload.email as string)
    if (payload.shift_id) {
      requestHeaders.set('x-user-shift', payload.shift_id as string)
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
