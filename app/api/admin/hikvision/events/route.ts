import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']
const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id!

  const { searchParams } = new URL(req.url)
  const deviceId  = searchParams.get('device_id')
  const dateFrom  = searchParams.get('date_from')
  const dateTo    = searchParams.get('date_to')
  const status    = searchParams.get('status')
  const offset    = parseInt(searchParams.get('offset') ?? '0', 10)

  let query = supabaseAdmin
    .from('hikvision_events')
    .select(`
      id, hik_employee_no, employee_name, event_time,
      attendance_status, verify_mode, card_no, processed,
      employees(first_name, last_name, employee_code),
      hikvision_devices(device_name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('event_time', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (deviceId) query = query.eq('device_id', deviceId)
  if (dateFrom) query = query.gte('event_time', dateFrom)
  if (dateTo)   query = query.lte('event_time', dateTo + 'T23:59:59Z')
  if (status)   query = query.eq('attendance_status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })

  return NextResponse.json({ events: data ?? [], total: count ?? 0 })
}
