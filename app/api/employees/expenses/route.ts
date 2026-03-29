import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('expense_requests')
    .select('id, amount, category, description, receipt_url, status, approved_amount, manager_note, created_at')
    .eq('employee_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  return NextResponse.json({ expenses: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { amount, category, description, receipt_url } = await req.json() as {
    amount: number
    category: string
    description: string
    receipt_url?: string
  }

  const CATEGORIES = ['Travel', 'Food', 'Medical', 'Equipment', 'Accommodation', 'Other']
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('expense_requests')
    .insert({
      tenant_id: tenantId,
      employee_id: session.id,
      amount,
      category,
      description: description.trim(),
      receipt_url: receipt_url || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to submit expense' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id }, { status: 201 })
}
