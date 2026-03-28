import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WelcomePopup } from '@/components/shared/WelcomePopup'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, Wallet, Clock, FileText } from 'lucide-react'

export default async function EmployeeDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select(
      'id, first_name, last_name, employee_code, role, shift_id, joining_date, base_salary, leave_balance, profile_photo, first_login, increment_message, bonus_message'
    )
    .eq('id', session.id)
    .single()

  if (!employee) redirect('/login')

  // Redirect admins/managers to admin dashboard
  if (['master_admin', 'manager', 'attendance'].includes(employee.role)) {
    redirect('/admin/dashboard')
  }

  const { data: shift } = employee.shift_id
    ? await supabaseAdmin
        .from('shifts')
        .select('name, start_time, end_time')
        .eq('id', employee.shift_id)
        .single()
    : { data: null }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Welcome popup on first login */}
      {employee.first_login && (
        <WelcomePopup
          employeeName={employee.first_name}
          employeeCode={employee.employee_code}
        />
      )}

      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <span className="font-semibold text-white text-sm">ESAM HR</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">{employee.employee_code || 'Pending'}</Badge>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Alerts */}
        {employee.increment_message && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg p-4 text-sm">
            🎉 <strong>Increment Notice:</strong> {employee.increment_message}
          </div>
        )}
        {employee.bonus_message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-4 text-sm">
            💰 <strong>Bonus Notice:</strong> {employee.bonus_message}
          </div>
        )}

        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-zinc-700 overflow-hidden shrink-0 border-2 border-zinc-600">
              {employee.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.profile_photo}
                  alt={employee.first_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-400">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-zinc-400 text-sm mt-0.5">
                ID: <span className="font-mono text-zinc-300">{employee.employee_code || '—'}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {shift && (
                  <Badge variant="secondary" className="text-xs">
                    {shift.name} ({shift.start_time} – {shift.end_time})
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  Joined: {new Date(employee.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Base Salary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-white">
                ₹{Number(employee.base_salary).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500">per month</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-white">{employee.leave_balance}</p>
              <p className="text-xs text-zinc-500">days remaining</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Daily Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-white">
                ₹{Math.round(Number(employee.base_salary) / 30).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500">per day (base/30)</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-white">—</p>
              <p className="text-xs text-zinc-500">support tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder — Phase 2 will fill these */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 border-dashed opacity-60">
            <CardContent className="flex items-center justify-center h-40 text-zinc-500 text-sm">
              Attendance Calendar — Phase 2
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 border-dashed opacity-60">
            <CardContent className="flex items-center justify-center h-40 text-zinc-500 text-sm">
              Leave Request Form — Phase 2
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
