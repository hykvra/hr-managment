import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  let query = supabaseAdmin
    .from('expense_requests')
    .select('id, amount, category, description, receipt_url, status, approved_amount, manager_note, created_at, employees(first_name, last_name, employee_code)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  return NextResponse.json({ expenses: data || [] })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { id, action, approved_amount, manager_note } = await req.json() as {
    id: string
    action: 'approve' | 'reject'
    approved_amount?: number
    manager_note?: string
  }

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Verify it belongs to this tenant
  const { data: existing } = await supabaseAdmin
    .from('expense_requests')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'pending') return NextResponse.json({ error: 'Already actioned' }, { status: 409 })

  const updates: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    manager_note: manager_note?.trim() || null,
  }
  if (action === 'approve') {
    updates.approved_amount = approved_amount || null
  }

  const { error } = await supabaseAdmin
    .from('expense_requests')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  return NextResponse.json({ success: true })
}
