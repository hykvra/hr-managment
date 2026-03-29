import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'submit') {
    const today = new Date()
    const resignationDate = today.toISOString().split('T')[0]
    const lastWorking = new Date(today)
    lastWorking.setDate(lastWorking.getDate() + 30)
    const lastWorkingDate = lastWorking.toISOString().split('T')[0]

    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        resignation_status: true,
        resignation_date: resignationDate,
        last_working_date: lastWorkingDate,
      })
      .eq('id', session.id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: 'Failed to submit resignation' }, { status: 500 })
  } else if (action === 'withdraw') {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        resignation_status: false,
        resignation_date: null,
        last_working_date: null,
      })
      .eq('id', session.id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: 'Failed to withdraw resignation' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
