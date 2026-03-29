import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const month = searchParams.get('month') // YYYY-MM

  let query = supabaseAdmin
    .from('salary_advances')
    .select(`
      id, amount, approved_amount, reason, status, manager_comment, created_at,
      employees!inner(first_name, last_name, employee_code, base_salary)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  if (month) {
    const firstDay = `${month}-01`
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).toISOString().split('T')[0]
    query = query.gte('created_at', firstDay).lte('created_at', `${lastDay}T23:59:59`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch advances' }, { status: 500 })

  const advances = data || []
  const total_requested = advances.reduce((s, a) => s + Number(a.amount), 0)
  const total_approved = advances
    .filter(a => a.status === 'approved')
    .reduce((s, a) => s + Number(a.approved_amount || a.amount), 0)

  return NextResponse.json({ advances, total_requested, total_approved })
}
