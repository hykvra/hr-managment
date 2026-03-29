import { NextRequest, NextResponse } from 'next/server'
import { clearSuperAuthCookie } from '@/lib/super-auth'
import { publicUrl } from '@/lib/url'

export async function POST(req: NextRequest) {
  const cookieOpts = clearSuperAuthCookie() as {
    name: string; value: string; httpOnly: boolean
    secure: boolean; sameSite: 'lax'; maxAge: number; path: string
  }
  const response = NextResponse.redirect(publicUrl('/super-admin/login', req))
  response.cookies.set(cookieOpts)
  return response
}
