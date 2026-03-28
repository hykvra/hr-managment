import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { leave_type, leave_date, end_date } = body

  if (!leave_type || !leave_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validTypes = ['Sick', 'Casual', 'Earned', 'Vacation']
  if (!validTypes.includes(leave_type)) {
    return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 })
  }

  // Check for existing pending/approved leave on this start date
  const { data: existing } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .eq('employee_id', session.id)
    .eq('leave_date', leave_date)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a leave request for this date' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('leave_requests').insert({
    employee_id: session.id,
    leave_type,
    leave_date,
    end_date: end_date || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
