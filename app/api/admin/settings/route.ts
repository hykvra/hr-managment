import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { settings } = await req.json() as { settings: Record<string, string> }

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
  }

  const validKeys = [
    'max_leaves_per_day',
    'advance_max_percent',
    'penalty_multiplier',
    'brand_name',
    'brand_color',
    'brand_initials',
    'timezone',
  ]

  for (const [key, value] of Object.entries(settings)) {
    if (!validKeys.includes(key)) continue
    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert(
        { tenant_id: tenantId, setting_key: key, setting_value: String(value) },
        { onConflict: 'tenant_id,setting_key' }
      )
    if (error) return NextResponse.json({ error: `Failed to update ${key}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
