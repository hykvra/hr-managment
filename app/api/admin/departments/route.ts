import { NextRequest, NextResponse } from 'next/server'
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
    .from('departments')
    .select('id, name, description, created_at')
    .eq('tenant_id', tenantId)
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  return NextResponse.json({ departments: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { name, description } = await req.json() as { name: string; description?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({ tenant_id: tenantId, name: name.trim(), description: description?.trim() || null })
    .select('id, name, description, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Department already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
  return NextResponse.json({ department: data }, { status: 201 })
}
