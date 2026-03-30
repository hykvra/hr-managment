import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { parseBranding } from '@/lib/branding'
import { getSubscriptionInfo } from '@/lib/subscription'

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

  // ── Subscription gate — check before heavy queries ────────────────────────
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, company_name, plan, status, max_employees, trial_ends_at, created_at')
    .eq('id', tid)
    .single()

  if (tenant) {
    const subInfo = getSubscriptionInfo(tenant)
    if (subInfo.status === 'suspended') redirect('/suspended')
    if (subInfo.status === 'trial_expired') redirect('/trial-expired')
  }

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
  ])

  const branding = parseBranding(companySettings || [])

  // Celebrations (non-critical — fail silently)
  type CelebrationAlert = {
    type: 'birthday' | 'anniversary'; employee_id: string; first_name: string; last_name: string
    employee_code: string | null; profile_photo: string | null; days_away: number; years?: number
  }
  let celebrationsToday: CelebrationAlert[] = []
  let celebrationsUpcoming: CelebrationAlert[] = []
  try {
    const { data: empList } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, dob, joining_date, profile_photo')
      .eq('tenant_id', tid)
      .eq('is_active', true)
      .not('role', 'in', '("master_admin","attendance")')

    const today = new Date()
    const alerts: CelebrationAlert[] = []
    for (const emp of empList || []) {
      if (emp.dob) {
        const dob = new Date(emp.dob)
        const bd = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
        if (bd < today) bd.setFullYear(today.getFullYear() + 1)
        const diff = Math.round((bd.getTime() - today.getTime()) / 86400000)
        if (diff <= 30) alerts.push({ type: 'birthday', employee_id: emp.id, first_name: emp.first_name, last_name: emp.last_name, employee_code: emp.employee_code, profile_photo: emp.profile_photo, days_away: diff })
      }
      if (emp.joining_date) {
        const jd = new Date(emp.joining_date)
        const ann = new Date(today.getFullYear(), jd.getMonth(), jd.getDate())
        if (ann < today) ann.setFullYear(today.getFullYear() + 1)
        const diff = Math.round((ann.getTime() - today.getTime()) / 86400000)
        const years = ann.getFullYear() - jd.getFullYear()
        if (diff <= 30 && years > 0) alerts.push({ type: 'anniversary', employee_id: emp.id, first_name: emp.first_name, last_name: emp.last_name, employee_code: emp.employee_code, profile_photo: emp.profile_photo, days_away: diff, years })
      }
    }
    alerts.sort((a, b) => a.days_away - b.days_away)
    celebrationsToday = alerts.filter(a => a.days_away === 0)
    celebrationsUpcoming = alerts.filter(a => a.days_away > 0)
  } catch { /* non-critical */ }

  // Trial banner info
  const trialBanner = (() => {
    if (!tenant) return null
    const info = getSubscriptionInfo(tenant)
    if (info.status !== 'trial') return null
    return { daysLeft: info.trialDaysLeft ?? 30, urgent: (info.trialDaysLeft ?? 30) <= 7 }
  })()

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: branding.color }}
          >
            <span className="text-white font-bold text-xs">{branding.initials}</span>
          </div>
          <span className="font-semibold text-white text-sm">{branding.name} — Admin</span>
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

      <div className="flex flex-1 min-h-0">
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
          celebrationsToday={celebrationsToday}
          celebrationsUpcoming={celebrationsUpcoming}
          trialBanner={trialBanner}
        />
      </div>
    </div>
  )
}
