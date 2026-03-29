import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { brand_name, brand_color, brand_initials, company_domain } = body

  const tenantId = session.tenant_id as string

  // Save branding settings
  const brandingEntries = [
    { setting_key: 'brand_name', setting_value: brand_name?.trim() || '' },
    { setting_key: 'brand_color', setting_value: brand_color || '#2563eb' },
    { setting_key: 'brand_initials', setting_value: brand_initials?.trim() || '' },
  ].filter(e => e.setting_value)

  for (const entry of brandingEntries) {
    await supabaseAdmin
      .from('company_settings')
      .upsert({ tenant_id: tenantId, ...entry }, { onConflict: 'tenant_id,setting_key' })
  }

  // Save company domain if provided
  if (company_domain?.trim()) {
    const clean = company_domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    await supabaseAdmin
      .from('tenants')
      .update({ company_domain: clean })
      .eq('id', tenantId)
  }

  // Mark first_login = false on the employee
  await supabaseAdmin
    .from('employees')
    .update({ first_login: false })
    .eq('id', session.id as string)

  // Re-issue JWT with first_login: false so middleware stops redirecting
  const newToken = await signToken({
    id: session.id,
    email: session.email,
    role: session.role,
    tenant_id: session.tenant_id,
    shift_id: session.shift_id,
    first_login: false,
  })

  const cookieOpts = setAuthCookie(newToken) as Parameters<NextResponse['cookies']['set']>[0]
  const response = NextResponse.json({ success: true })
  response.cookies.set(cookieOpts)
  return response
}
