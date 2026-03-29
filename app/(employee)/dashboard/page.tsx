import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WelcomePopup } from '@/components/shared/WelcomePopup'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceCalendar } from '@/components/employee/AttendanceCalendar'
import { SalaryEstimateWidget } from '@/components/employee/SalaryEstimateWidget'
import { HistoryTabs } from '@/components/employee/HistoryTabs'
import { DashboardActions } from '@/components/employee/DashboardActions'
import { CalendarDays, Wallet, Clock, FileText } from 'lucide-react'
import { parseBranding } from '@/lib/branding'
import { getSubscriptionInfo } from '@/lib/subscription'

export default async function EmployeeDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select(
      'id, first_name, last_name, email, mobile, address, employee_code, role, shift_id, joining_date, base_salary, leave_balance, profile_photo, first_login, increment_message, bonus_message, total_penalties, resignation_status, resignation_date, last_working_date, emergency_name, emergency_phone, bank_name, account_no, ifsc, branch_name, account_holder'
    )
    .eq('id', session.id)
    .single()

  if (!employee) redirect('/login')

  if (['master_admin', 'manager', 'attendance'].includes(employee.role)) {
    redirect('/admin/dashboard')
  }

  // ── Subscription gate ─────────────────────────────────────────────────────
  const { data: tenantRecord } = await supabaseAdmin
    .from('tenants')
    .select('plan, status, max_employees, trial_ends_at')
    .eq('id', session.tenant_id)
    .single()

  if (tenantRecord) {
    const subInfo = getSubscriptionInfo(tenantRecord)
    if (subInfo.status === 'suspended') redirect('/suspended')
    if (subInfo.status === 'trial_expired') redirect('/trial-expired')
  }

  const { data: shift } = employee.shift_id
    ? await supabaseAdmin
        .from('shifts')
        .select('name, start_time, end_time')
        .eq('id', employee.shift_id)
        .single()
    : { data: null }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

  const [
    { data: attendance },
    { data: leaveRequests },
    { data: advances },
    { data: tickets },
    { data: salaryHistory },
    { data: bonusHistory },
    { data: companySettings },
  ] = await Promise.all([
    supabaseAdmin.from('attendance').select('date, status').eq('employee_id', employee.id).gte('date', firstDay).lte('date', lastDay),
    supabaseAdmin.from('leave_requests').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('salary_advances').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('support_tickets').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('salary_history').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('bonus_history').select('*').eq('employee_id', employee.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('company_settings').select('setting_key, setting_value').eq('tenant_id', session.tenant_id),
  ])

  const openTickets = (tickets || []).filter(t => t.status === 'open').length
  const hasPendingAdvance = (advances || []).some(a => a.status === 'pending')
  const branding = parseBranding(companySettings || [])

  return (
    <div className="min-h-screen bg-zinc-950">
      {employee.first_login && (
        <WelcomePopup employeeName={employee.first_name} employeeCode={employee.employee_code} />
      )}

      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: branding.color }}
          >
            <span className="text-white font-bold text-xs">{branding.initials}</span>
          </div>
          <span className="font-semibold text-white text-sm hidden sm:inline">{branding.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs font-mono">{employee.employee_code || 'Pending'}</Badge>
          <DashboardActions
            employee={{
              email: employee.email,
              mobile: employee.mobile,
              address: employee.address,
              emergency_name: employee.emergency_name,
              emergency_phone: employee.emergency_phone,
              bank_name: employee.bank_name,
              account_no: employee.account_no,
              ifsc: employee.ifsc,
              branch_name: employee.branch_name,
              account_holder: employee.account_holder,
            }}
            baseSalary={Number(employee.base_salary)}
            leaveBalance={Number(employee.leave_balance)}
            hasPendingAdvance={hasPendingAdvance}
            resignationStatus={employee.resignation_status}
            resignationDate={employee.resignation_date}
            lastWorkingDate={employee.last_working_date}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        {employee.resignation_status && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
            ⚠️ <strong>Resignation Active:</strong> Your last working date is{' '}
            {employee.last_working_date
              ? new Date(employee.last_working_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
              : '—'}
          </div>
        )}
        {employee.increment_message && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg p-3 text-sm">
            🎉 <strong>Increment Notice:</strong> {employee.increment_message}
          </div>
        )}
        {employee.bonus_message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm">
            💰 <strong>Bonus Notice:</strong> {employee.bonus_message}
          </div>
        )}

        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-5 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden shrink-0 border-2 border-zinc-600">
              {employee.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={employee.profile_photo} alt={employee.first_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-zinc-400 text-xs mt-0.5">
                ID: <span className="font-mono text-zinc-300">{employee.employee_code || '—'}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {shift && (
                  <Badge variant="secondary" className="text-xs">
                    {shift.name} · {shift.start_time} – {shift.end_time}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  Joined {new Date(employee.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Base Salary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-bold text-white">₹{Number(employee.base_salary).toLocaleString('en-IN')}</p>
              <p className="text-xs text-zinc-500">per month</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-bold text-white">{employee.leave_balance}</p>
              <p className="text-xs text-zinc-500">days remaining</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Daily Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-bold text-white">
                ₹{Math.round(Number(employee.base_salary) / 30).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500">per day</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-bold text-white">{openTickets}</p>
              <p className="text-xs text-zinc-500">open tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar + Salary Estimate */}
        <div className="grid md:grid-cols-2 gap-4">
          <AttendanceCalendar
            initialAttendance={attendance || []}
            leaveRequests={leaveRequests || []}
            initialYear={year}
            initialMonth={month}
          />
          <SalaryEstimateWidget
            baseSalary={Number(employee.base_salary)}
            leaveBalance={Number(employee.leave_balance)}
            attendance={attendance || []}
            bonusHistory={bonusHistory || []}
            advances={advances || []}
            penalties={Number(employee.total_penalties)}
            currentMonth={month}
            currentYear={year}
          />
        </div>

        {/* History */}
        <HistoryTabs
          leaveRequests={leaveRequests || []}
          advances={advances || []}
          tickets={tickets || []}
          salaryHistory={salaryHistory || []}
          bonusHistory={bonusHistory || []}
        />
      </main>
    </div>
  )
}
