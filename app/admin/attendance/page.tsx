import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceTabs } from '@/components/attendance/AttendanceTabs'
import { CalendarCheck } from 'lucide-react'
import { parseBranding } from '@/lib/branding'

export default async function AttendancePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowed = ['master_admin', 'manager', 'attendance']
  if (!allowed.includes(session.role)) redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  const tid = session.tenant_id

  const [
    { data: employees },
    { data: shifts },
    { data: todayRecords },
    { data: todayLeaves },
    { data: companySettings },
  ] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, shift_id')
      .eq('tenant_id', tid)
      .eq('is_active', true)
      .order('first_name'),
    supabaseAdmin
      .from('shifts')
      .select('id, name')
      .eq('tenant_id', tid)
      .order('name'),
    supabaseAdmin
      .from('attendance')
      .select('employee_id, status')
      .eq('tenant_id', tid)
      .eq('date', today),
    supabaseAdmin
      .from('leave_requests')
      .select('employee_id')
      .eq('tenant_id', tid)
      .eq('status', 'approved')
      .or(`and(leave_date.eq.${today},end_date.is.null),and(leave_date.lte.${today},end_date.gte.${today})`),
    supabaseAdmin
      .from('company_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tid),
  ])

  const todayAttendance: Record<string, string> = {}
  for (const r of todayRecords || []) {
    todayAttendance[r.employee_id] = r.status
  }
  const todayApprovedLeaveIds = (todayLeaves || []).map(l => l.employee_id as string)

  const markedToday = Object.keys(todayAttendance).length
  const totalEmployees = (employees || []).length
  const branding = parseBranding(companySettings || [])

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: branding.color }}
          >
            <span className="text-white font-bold text-xs">{branding.initials}</span>
          </div>
          <span className="font-semibold text-white text-sm">{branding.name} — Attendance</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs capitalize">{session.role.replace('_', ' ')}</Badge>
          {session.role !== 'attendance' && (
            <a href="/admin/dashboard" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Dashboard
            </a>
          )}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Attendance</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Mark daily attendance and view monthly reports</p>
        </div>

        {/* Quick stat */}
        <div className="grid grid-cols-2 gap-3 sm:w-72">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <div className="bg-blue-500/10 rounded p-1">
                  <CalendarCheck className="w-3 h-3 text-blue-400" />
                </div>
                Marked Today
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-3xl font-bold ${markedToday > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                {markedToday}
                <span className="text-zinc-500 text-base font-normal">/{totalEmployees}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance tabs */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <AttendanceTabs
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              employees={(employees || []) as any}
              shifts={shifts || []}
              todayDate={today}
              todayAttendance={todayAttendance}
              todayApprovedLeaveIds={todayApprovedLeaveIds}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
