import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function canSendBroadcast(role: string, userId: string): Promise<boolean> {
  if (role === 'master_admin') return true
  const { data } = await supabaseAdmin
    .from('admin_permissions')
    .select('can_send_broadcast')
    .eq('employee_id', userId)
    .maybeSingle()
  return (data as { can_send_broadcast: boolean } | null)?.can_send_broadcast === true
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await canSendBroadcast(session.role, session.id))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { message, target_shift } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('broadcasts').insert({
    message: message.trim(),
    target_shift: target_shift || 'All',
    created_by: session.id,
  })

  if (error) return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  return NextResponse.json({ success: true })
}
