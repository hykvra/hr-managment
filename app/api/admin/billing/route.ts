import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All admin roles can view billing info
  if (!['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const [
    { data: tenant, error: tenantErr },
    { count: employeeCount },
  ] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, slug, company_name, plan, status, max_employees, trial_ends_at, created_at')
      .eq('id', tenantId)
      .single(),
    supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .neq('role', 'master_admin'),
  ])

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({
    tenant,
    employeeCount: employeeCount ?? 0,
  })
}
