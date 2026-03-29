import { NextRequest, NextResponse } from 'next/server'
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSuperSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entity_type = searchParams.get('entity_type')   // 'tenant' | 'employee' | 'auth'
  const limit       = Math.min(Number(searchParams.get('limit') ?? '100'), 500)
  const offset      = Number(searchParams.get('offset') ?? '0')

  let query = supabaseAdmin
    .from('super_admin_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entity_type) {
    query = query.eq('entity_type', entity_type)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
