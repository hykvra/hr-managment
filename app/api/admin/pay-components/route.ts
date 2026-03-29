import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  if (!employeeId) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('employee_pay_components')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('component_type')
    .order('component_name')

  if (error) return NextResponse.json({ error: 'Failed to fetch pay components' }, { status: 500 })
  return NextResponse.json({ components: data || [] })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { employee_id, component_name, component_type, amount, is_percentage } = body

  if (!employee_id || !component_name?.trim() || !component_type || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['allowance', 'deduction'].includes(component_type)) {
    return NextResponse.json({ error: 'Invalid component type' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('employee_pay_components')
    .insert({
      tenant_id: tenantId,
      employee_id,
      component_name: component_name.trim(),
      component_type,
      amount,
      is_percentage: is_percentage ?? false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A component with this name already exists for this employee' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create pay component' }, { status: 500 })
  }

  return NextResponse.json({ component: data })
}
