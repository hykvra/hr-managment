import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabaseAdmin
    .from('employees')
    .update({ first_login: false, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return NextResponse.json({ success: true })
}
