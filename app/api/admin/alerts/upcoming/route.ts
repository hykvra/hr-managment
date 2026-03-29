import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || !['master_admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data: employees, error } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, dob, joining_date, profile_photo')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('role', 'in', '("master_admin","attendance")')

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const today = new Date()
  const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  type Alert = {
    type: 'birthday' | 'anniversary'
    employee_id: string
    first_name: string
    last_name: string
    employee_code: string | null
    profile_photo: string | null
    date: string          // original date
    days_away: number
    years?: number
  }

  const alerts: Alert[] = []

  for (const emp of employees || []) {
    // Birthday
    if (emp.dob) {
      const dob = new Date(emp.dob)
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1)
      }
      const diffDays = Math.round((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) {
        alerts.push({
          type: 'birthday',
          employee_id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_code: emp.employee_code,
          profile_photo: emp.profile_photo,
          date: emp.dob,
          days_away: diffDays,
        })
      }
    }

    // Work Anniversary
    if (emp.joining_date) {
      const joined = new Date(emp.joining_date)
      const thisYearAnniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate())
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(today.getFullYear() + 1)
      }
      const diffDays = Math.round((thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const years = thisYearAnniversary.getFullYear() - joined.getFullYear()
      if (diffDays <= 30 && years > 0) {
        alerts.push({
          type: 'anniversary',
          employee_id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          employee_code: emp.employee_code,
          profile_photo: emp.profile_photo,
          date: emp.joining_date,
          days_away: diffDays,
          years,
        })
      }
    }
  }

  // Sort by days_away ascending, then by type
  alerts.sort((a, b) => {
    if (a.days_away !== b.days_away) return a.days_away - b.days_away
    return a.type.localeCompare(b.type)
  })

  // Also separate today's alerts
  const todayAlerts = alerts.filter(a => a.days_away === 0)
  const upcomingAlerts = alerts.filter(a => a.days_away > 0)

  return NextResponse.json({ today: todayAlerts, upcoming: upcomingAlerts, todayMD })
}
