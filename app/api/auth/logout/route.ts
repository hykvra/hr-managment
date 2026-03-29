import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const cookieOpts = clearAuthCookie() as {
    name: string
    value: string
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: string
  }
  const response = NextResponse.redirect(new URL('/login', req.url))
  response.cookies.set(cookieOpts)
  return response
}
