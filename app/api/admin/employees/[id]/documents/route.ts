import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, doc_type, doc_name, file_url, file_size, uploaded_at')
    .eq('employee_id', params.id)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  return NextResponse.json({ documents: data || [] })
}
