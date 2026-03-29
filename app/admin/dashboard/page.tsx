import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { Users, CalendarCheck, Banknote, Ticket } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowedRoles = ['master_admin', 'manager']
  if (!allowedRoles.includes(session.role)) {
    if (session.role === 'attendance') redirect('/admin/attendance')
    redirect('/dashboard')
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const tid = session.tenant_id

  const [
    { data: pendingEmployees },
    { data: pendingLeaves },
    { data: pendingAdvances },
    { data: recentApprovedAdvances },
    { data: openTickets },
    { data: shifts },
    { data: recentBroadcasts },
    { data: companySettings },
    { data: managers },
    { data: currentPermissions },
    { count: pendingLeaveCount },
    { count: pendingAdvanceCount },
    { count: openTicketCount },
    { count: pendingRegCount },
  ] = await Promise.all([
    supabaseAdmin.from('employees').select('id, first_name, last_name, email, mobile, dob, gender, profile_photo, created_at')
      .eq('tenant_id', tid).eq('is_active', false).order('created_at', { ascending: false }),
    supabaseAdmin.from('leave_requests')
      .select('id, leave_date, end_date, leave_type, exception_flag, created_at, employees!employee_id(first_name, last_name, employee_code)')
      .eq('tenant_id', tid).eq('status', 'pending').order('created_at', { ascending: false }),
    supabaseAdmin.from('salary_advances')
      .select('id, amount, approved_amount, reason, status, created_at, employees!employee_id(first_name, last_name, employee_code, base_salary)')
      .eq('tenant_id', tid).eq('status', 'pending').order('created_at', { ascending: false }),
    supabaseAdmin.from('salary_advances')
      .select('id, amount, approved_amount, reason, status, created_at, employees!employee_id(first_name, last_name, employee_code, base_salary)')
      .eq('tenant_id', tid).eq('status', 'approved').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('support_tickets')
      .select('id, subject, message, created_at, employees!employee_id(first_name, last_name, employee_code)')
      .eq('tenant_id', tid).eq('status', 'open').order('created_at', { ascending: false }),
    supabaseAdmin.from('shifts').select('id, name, start_time, end_time').eq('tenant_id', tid).order('name'),
    supabaseAdmin.from('broadcasts')
      .select('id, message, target_shift, created_at, employees!created_by(first_name, last_name)')
      .eq('tenant_id', tid).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('company_settings').select('setting_key, setting_value').eq('tenant_id', tid),
    supabaseAdmin.from('employees')
      .select('id, first_name, last_name, employee_code, admin_permissions(can_approve_leaves, can_manage_salary, can_view_reports, can_manage_shifts, can_send_broadcast)')
      .eq('tenant_id', tid).eq('role', 'manager').eq('is_active', true),
    session.role === 'manager'
      ? supabaseAdmin.from('admin_permissions')
          .select('can_approve_leaves, can_manage_salary, can_manage_shifts, can_send_broadcast')
          .eq('employee_id', session.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'pending'),
    supabaseAdmin.from('salary_advances').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'pending'),
    supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'open'),
    supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', false),
  ])

  const stats = [
    { label: 'Pending Registrations', value: pendingRegCount ?? 0,    icon: Users,         color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Pending Leaves',        value: pendingLeaveCount ?? 0,   icon: CalendarCheck, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
    { label: 'Pending Advances',      value: pendingAdvanceCount ?? 0, icon: Banknote,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Open Tickets',          value: openTicketCount ?? 0,     icon: Ticket,        color: 'text-red-400',    bg: 'bg-red-500/10'    },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <span className="font-semibold text-white text-sm">ESAM HR — Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs capitalize">{session.role.replace('_', ' ')}</Badge>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Manage employees, leaves, advances, and settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                  <div className={`${s.bg} rounded p-1`}>
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                  </div>
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-3xl font-bold ${s.value > 0 ? s.color : 'text-zinc-500'}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main tabbed interface */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <AdminTabs
              role={session.role}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              permissions={currentPermissions as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pendingEmployees={(pendingEmployees || []) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pendingLeaves={(pendingLeaves || []) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pendingAdvances={(pendingAdvances || []) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recentApprovedAdvances={(recentApprovedAdvances || []) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              openTickets={(openTickets || []) as any}
              shifts={shifts || []}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recentBroadcasts={(recentBroadcasts || []) as any}
              companySettings={companySettings || []}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              managers={(managers || []) as any}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
