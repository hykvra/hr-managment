import { NextResponse } from 'next/server'
import { clearSuperAuthCookie } from '@/lib/super-auth'

export async function POST() {
  const cookieOpts = clearSuperAuthCookie() as {
    name: string; value: string; httpOnly: boolean
    secure: boolean; sameSite: 'lax'; maxAge: number; path: string
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set(cookieOpts)
  return response
}
