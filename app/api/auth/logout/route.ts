import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
import { publicUrl } from '@/lib/url'

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
  const response = NextResponse.redirect(publicUrl('/login', req))
  response.cookies.set(cookieOpts)
  return response
}
