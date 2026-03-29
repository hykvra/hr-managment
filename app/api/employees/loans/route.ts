import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('employee_loans')
    .select('id, amount, reason, emi_amount, disbursed_on, months_total, months_paid, status, created_at')
    .eq('employee_id', session.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })

  return NextResponse.json({ loans: data || [] })
}
