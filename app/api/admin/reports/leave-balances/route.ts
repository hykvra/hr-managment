import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  // Get all active employees
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, leave_balance, monthly_leave_quota')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'in', '("master_admin")')
    .order('first_name')

  // Get all leave types for tenant
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('id, name, color, annual_quota')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  // Get leave balances for this year
  const { data: balances } = await supabaseAdmin
    .from('employee_leave_balances')
    .select('employee_id, leave_type_id, accrued, used, carry_forward, opening_balance')
    .eq('tenant_id', tenantId)
    .eq('year', year)

  // Get pending/approved leave counts for this year (to show used days if no balance records)
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const { data: leaveRequests } = await supabaseAdmin
    .from('leave_requests')
    .select('employee_id, leave_type, leave_date, end_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ['approved'])
    .gte('leave_date', yearStart)
    .lte('leave_date', yearEnd)

  // Build balance map
  const balanceMap: Record<string, Record<string, { accrued: number; used: number; carry_forward: number; opening_balance: number }>> = {}
  for (const b of balances || []) {
    if (!balanceMap[b.employee_id]) balanceMap[b.employee_id] = {}
    balanceMap[b.employee_id][b.leave_type_id] = {
      accrued: Number(b.accrued),
      used: Number(b.used),
      carry_forward: Number(b.carry_forward),
      opening_balance: Number(b.opening_balance),
    }
  }

  // Calculate used days from leave_requests if no balance records
  const usedMap: Record<string, Record<string, number>> = {}
  for (const lr of leaveRequests || []) {
    const start = new Date(lr.leave_date)
    const end = lr.end_date ? new Date(lr.end_date) : start
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
    if (!usedMap[lr.employee_id]) usedMap[lr.employee_id] = {}
    const typeName = lr.leave_type
    usedMap[lr.employee_id][typeName] = (usedMap[lr.employee_id][typeName] || 0) + days
  }

  const result = (employees || []).map(emp => {
    if (leaveTypes && leaveTypes.length > 0) {
      const typeBreakdown = leaveTypes.map(lt => {
        const bal = balanceMap[emp.id]?.[lt.id]
        const accrued = bal?.accrued ?? Number(lt.annual_quota)
        const used = bal?.used ?? (usedMap[emp.id]?.[lt.name] || 0)
        const carry = bal?.carry_forward ?? 0
        const remaining = Math.max(0, accrued + carry - used)
        return {
          leave_type_id: lt.id,
          leave_type_name: lt.name,
          color: lt.color,
          annual_quota: Number(lt.annual_quota),
          accrued,
          used,
          carry_forward: carry,
          remaining,
        }
      })
      return {
        employee_id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        employee_code: emp.employee_code,
        leave_types: typeBreakdown,
        total_remaining: typeBreakdown.reduce((s, t) => s + t.remaining, 0),
        // Legacy
        leave_balance: Number(emp.leave_balance),
      }
    } else {
      // Fallback: no custom leave types yet, use legacy leave_balance
      return {
        employee_id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        employee_code: emp.employee_code,
        leave_types: [],
        total_remaining: Number(emp.leave_balance),
        leave_balance: Number(emp.leave_balance),
      }
    }
  })

  return NextResponse.json({ employees: result, leave_types: leaveTypes || [], year })
}
