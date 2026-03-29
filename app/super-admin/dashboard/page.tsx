import { redirect } from 'next/navigation'
import { getSuperSession } from '@/lib/super-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { TenantDashboard } from '@/components/super-admin/TenantDashboard'

export default async function SuperAdminDashboardPage() {
  const session = await getSuperSession()
  if (!session) redirect('/super-admin/login')

  // Fetch all tenants
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  // Employee counts per tenant
  const { data: empRows } = await supabaseAdmin
    .from('employees')
    .select('tenant_id')
    .eq('is_active', true)
    .not('role', 'in', '("master_admin")')

  const countMap: Record<string, number> = {}
  for (const e of empRows || []) {
    countMap[e.tenant_id] = (countMap[e.tenant_id] || 0) + 1
  }

  const tenantsWithCount = (tenants || []).map(t => ({
    ...t,
    employee_count: countMap[t.id] || 0,
  }))

  return (
    <TenantDashboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenants={tenantsWithCount as any}
      superAdminName={session.name}
    />
  )
}
