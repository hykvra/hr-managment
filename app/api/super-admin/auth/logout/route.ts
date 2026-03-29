import { NextRequest, NextResponse } from 'next/server'
import { clearSuperAuthCookie } from '@/lib/super-auth'

export async function POST(req: NextRequest) {
  const cookieOpts = clearSuperAuthCookie() as {
    name: string; value: string; httpOnly: boolean
    secure: boolean; sameSite: 'lax'; maxAge: number; path: string
  }
  const response = NextResponse.redirect(new URL('/super-admin/login', req.url))
  response.cookies.set(cookieOpts)
  return response
}
