import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
import { publicUrl } from '@/lib/url'
import { activityLog } from '@/lib/activity-logger'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session) {
    await activityLog({
      action: 'employee_logout',
      tenant_id: session.tenant_id,
      actor_id: session.id,
      actor_email: session.email,
      actor_role: session.role,
      req,
    })
  }
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
