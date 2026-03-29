import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
  if (!domain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  // Strip protocol/www if user pastes a full URL
  const clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('slug, company_name')
    .eq('company_domain', clean)
    .in('status', ['active', 'trial'])
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No workspace found for that domain' }, { status: 404 })

  return NextResponse.json({ slug: data.slug, company_name: data.company_name })
}
