import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('payroll_records')
    .select('*')
    .eq('employee_id', session.id)
    .eq('status', 'paid')
    .order('month', { ascending: false })

  return NextResponse.json({ payslips: data || [] })
}
