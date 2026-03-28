import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reply } = await req.json()

  if (!reply?.trim()) {
    return NextResponse.json({ error: 'Reply is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'resolved', manager_reply: reply.trim() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Failed to resolve ticket' }, { status: 500 })
  return NextResponse.json({ success: true })
}
