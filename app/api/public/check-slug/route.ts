import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const RESERVED_SLUGS = [
  'www', 'app', 'api', 'admin', 'super', 'dashboard', 'mail', 'ftp',
  'smtp', 'pop', 'imap', 'blog', 'docs', 'help', 'support', 'status',
  'static', 'cdn', 'assets', 'login', 'signup', 'register', 'auth',
  'billing', 'account', 'settings', 'hrjo', 'esam',
]

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const slug = searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return NextResponse.json({ available: false, error: 'Slug is required' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ available: false, error: 'Only lowercase letters, numbers and hyphens allowed' })
  }

  if (slug.length < 3 || slug.length > 30) {
    return NextResponse.json({ available: false, error: 'Slug must be 3–30 characters' })
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({ available: false, error: 'This name is reserved' })
  }

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
