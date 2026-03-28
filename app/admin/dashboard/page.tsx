import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarCheck, Banknote, Ticket } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allowedRoles = ['master_admin', 'manager', 'attendance']
  if (!allowedRoles.includes(session.role)) redirect('/dashboard')

  // Pending counts
  const [
    { count: pendingLeaves },
    { count: pendingAdvances },
    { count: openTickets },
    { count: pendingRegistrations },
  ] = await Promise.all([
    supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('salary_advances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false),
  ])

  const stats = [
    {
      label: 'Pending Registrations',
      value: pendingRegistrations ?? 0,
      icon: Users,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Pending Leaves',
      value: pendingLeaves ?? 0,
      icon: CalendarCheck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pending Advances',
      value: pendingAdvances ?? 0,
      icon: Banknote,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Open Tickets',
      value: openTickets ?? 0,
      icon: Ticket,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <span className="font-semibold text-white text-sm">ESAM HR — Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs capitalize">{session.role.replace('_', ' ')}</Badge>
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Overview of pending actions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                  <div className={`${s.bg} rounded p-1`}>
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                  </div>
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-3xl font-bold ${s.value > 0 ? s.color : 'text-zinc-500'}`}>
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Phase 3 placeholders */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            'New Employee Approvals — Phase 3',
            'Leave Management — Phase 3',
            'Salary Advances — Phase 3',
            'Attendance Sheet — Phase 4',
          ].map((label) => (
            <Card key={label} className="bg-zinc-900 border-zinc-800 border-dashed opacity-60">
              <CardContent className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                {label}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
