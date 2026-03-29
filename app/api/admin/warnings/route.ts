import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')

  let query = supabaseAdmin
    .from('warning_letters')
    .select('id, warning_type, subject, description, issued_on, acknowledged_at, created_at, employees!warning_letters_employee_id_fkey(first_name, last_name, employee_code), issuer:employees!warning_letters_issued_by_fkey(first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('issued_on', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json({ warnings: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { employee_id, warning_type, subject, description, issued_on } = await req.json() as {
    employee_id: string
    warning_type: string
    subject: string
    description: string
    issued_on?: string
  }

  const TYPES = ['verbal', 'written', 'final']
  if (!employee_id) return NextResponse.json({ error: 'Employee required' }, { status: 400 })
  if (!TYPES.includes(warning_type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!subject?.trim()) return NextResponse.json({ error: 'Subject required' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  // Verify employee belongs to tenant
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('id', employee_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('warning_letters')
    .insert({
      tenant_id: tenantId,
      employee_id,
      issued_by: session.id,
      warning_type,
      subject: subject.trim(),
      description: description.trim(),
      issued_on: issued_on || new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to issue warning' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id }, { status: 201 })
}
