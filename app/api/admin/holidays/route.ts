import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET() {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('company_holidays')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date')

  if (error) return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
  return NextResponse.json({ holidays: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { name, date } = await req.json()
  if (!name?.trim() || !date) {
    return NextResponse.json({ error: 'Name and date are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('company_holidays')
    .insert({ tenant_id: tenantId, name: name.trim(), date })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A holiday already exists on this date' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 })
  }

  return NextResponse.json({ holiday: data })
}
