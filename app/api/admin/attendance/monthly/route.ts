import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager', 'attendance'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const employee_id = searchParams.get('employee_id')
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '')

  if (!employee_id || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month, 0).getDate()
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const [{ data: attendance }, { data: employee }] = await Promise.all([
    supabaseAdmin
      .from('attendance')
      .select('date, status')
      .eq('employee_id', employee_id)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabaseAdmin
      .from('employees')
      .select('first_name, last_name, employee_code, base_salary, leave_balance')
      .eq('id', employee_id)
      .single(),
  ])

  return NextResponse.json({ attendance: attendance || [], employee })
}
