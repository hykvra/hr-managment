import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/** Return current IST date (YYYY-MM-DD) and time (HH:MM:SS) */
function getIST() {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const iso = istNow.toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
}

/** GET — return today's punch record for the authenticated employee */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = getIST()

  const { data } = await supabaseAdmin
    .from('attendance')
    .select('status, clock_in_time, clock_out_time')
    .eq('employee_id', session.id)
    .eq('date', date)
    .maybeSingle()

  return NextResponse.json({ punch: data || null, date })
}

/** POST { action: 'in' | 'out' } — clock in or clock out */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.tenant_id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { action } = (await req.json()) as { action: 'in' | 'out' }
  if (action !== 'in' && action !== 'out') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { date, time } = getIST()

  const { data: existing } = await supabaseAdmin
    .from('attendance')
    .select('status, clock_in_time, clock_out_time')
    .eq('employee_id', session.id)
    .eq('date', date)
    .maybeSingle()

  if (action === 'in') {
    if (existing?.clock_in_time) {
      return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 })
    }
    const row = {
      tenant_id: session.tenant_id,
      employee_id: session.id,
      date,
      // Preserve admin-set status if already marked; otherwise default to Present
      status: existing?.status || 'Present',
      clock_in_time: time,
    }
    const { error } = await supabaseAdmin
      .from('attendance')
      .upsert(row, { onConflict: 'employee_id,date' })
    if (error) return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
    return NextResponse.json({ success: true, time })
  }

  // action === 'out'
  if (!existing?.clock_in_time) {
    return NextResponse.json({ error: 'You have not clocked in yet today' }, { status: 400 })
  }
  if (existing?.clock_out_time) {
    return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('attendance')
    .update({ clock_out_time: time })
    .eq('employee_id', session.id)
    .eq('date', date)

  if (error) return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
  return NextResponse.json({ success: true, time })
}
