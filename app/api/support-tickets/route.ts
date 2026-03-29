import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { subject, message } = body

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('support_tickets').insert({
    tenant_id: tenantId,
    employee_id: session.id,
    subject: subject.trim(),
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 })

  return NextResponse.json({ success: true })
}
