import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, doc_type, doc_name, file_url, file_size, uploaded_at')
    .eq('employee_id', session.id)
    .order('uploaded_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  return NextResponse.json({ documents: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { doc_type, doc_name, file_url, file_size } = body

  if (!doc_type || !file_url) {
    return NextResponse.json({ error: 'doc_type and file_url are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      tenant_id: tenantId,
      employee_id: session.id,
      doc_type,
      doc_name: doc_name || doc_type,
      file_url,
      file_size: file_size || null,
      uploaded_by: session.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
  return NextResponse.json({ document: data })
}
