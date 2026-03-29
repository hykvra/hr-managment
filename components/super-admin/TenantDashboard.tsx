'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Edit2, Users, CheckCircle2, Clock, XCircle,
  ExternalLink, Loader2, Building2, Globe, Shield, UserPlus, ChevronRight, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tenant = {
  id: string
  slug: string
  company_name: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  max_employees: number
  employee_count: number
  trial_ends_at: string | null
  created_at: string
}

type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean
  employee_code: string
  created_at: string
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  company_domain: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']),
  max_employees: z.preprocess(v => Number(v), z.number().min(1).max(10000)),
  admin_email: z.string().email('Valid email required'),
  admin_password: z.string().min(8, 'At least 8 characters'),
  admin_name: z.string().optional(),
})

const editSchema = z.object({
  company_name: z.string().min(2),
  plan: z.enum(['starter', 'pro', 'enterprise']),
  status: z.enum(['active', 'suspended', 'trial']),
  max_employees: z.preprocess(v => Number(v), z.number().min(1).max(10000)),
})

const addEmployeeSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(['master_admin', 'manager', 'attendance', 'employee']),
  employee_code: z.string().optional(),
})

type CreateData = z.infer<typeof createSchema>
type EditData = z.infer<typeof editSchema>
type AddEmployeeData = z.infer<typeof addEmployeeSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function planColor(plan: string) {
  if (plan === 'enterprise') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  if (plan === 'pro') return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  return 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'
}

function statusColor(status: string) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (status === 'trial') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return 'bg-red-500/10 text-red-400 border-red-500/20'
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  tenants: Tenant[]
  superAdminName: string
}

export function TenantDashboard({ tenants: initial, superAdminName }: Props) {
  const router = useRouter()
  const [tenants, setTenants] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [apiError, setApiError] = useState('')
  const [editError, setEditError] = useState('')

  // Employee panel state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empLoading, setEmpLoading] = useState(false)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [addEmpError, setAddEmpError] = useState('')

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    trial: tenants.filter(t => t.status === 'trial').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
  }

  // ── Create form ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) as any,
    defaultValues: { plan: 'starter', max_employees: 25 },
  })

  const onCreateSubmit = async (data: CreateData) => {
    setApiError('')
    const res = await fetch('/api/super-admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setApiError(json.error || 'Failed'); return }
    setShowCreate(false)
    createForm.reset()
    router.refresh()
    // Optimistic: refetch list
    fetchTenants()
  }

  const fetchTenants = async () => {
    const res = await fetch('/api/super-admin/tenants')
    if (res.ok) {
      const json = await res.json()
      setTenants(json.tenants)
    }
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) as any })

  const openEdit = (t: Tenant) => {
    setEditTenant(t)
    editForm.reset({
      company_name: t.company_name,
      plan: t.plan,
      status: t.status,
      max_employees: t.max_employees,
    })
    setEditError('')
  }

  const onEditSubmit = async (data: EditData) => {
    if (!editTenant) return
    setEditError('')
    const res = await fetch(`/api/super-admin/tenants/${editTenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setEditError(json.error || 'Failed'); return }
    setEditTenant(null)
    fetchTenants()
  }

  // ── Employee management ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addEmpForm = useForm<AddEmployeeData>({ resolver: zodResolver(addEmployeeSchema) as any,
    defaultValues: { role: 'employee' },
  })

  const openTenantEmployees = async (t: Tenant) => {
    setSelectedTenant(t)
    setEmpLoading(true)
    setShowAddEmployee(false)
    setAddEmpError('')
    const res = await fetch(`/api/super-admin/tenants/${t.id}/employees`)
    if (res.ok) {
      const json = await res.json()
      setEmployees(json.employees)
    }
    setEmpLoading(false)
  }

  const onAddEmployee = async (data: AddEmployeeData) => {
    if (!selectedTenant) return
    setAddEmpError('')
    const res = await fetch(`/api/super-admin/tenants/${selectedTenant.id}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setAddEmpError(json.error || 'Failed'); return }
    setShowAddEmployee(false)
    addEmpForm.reset({ role: 'employee' })
    openTenantEmployees(selectedTenant)
    fetchTenants()
  }

  const roleColor = (role: string) => {
    if (role === 'master_admin') return 'text-violet-400 bg-violet-500/10 border-violet-500/20'
    if (role === 'manager') return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    if (role === 'attendance') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-zinc-400 bg-zinc-700/50 border-zinc-600/30'
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">hrjo.in Super Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-xs hidden sm:block">{superAdminName}</span>
          <form action="/api/super-admin/auth/logout" method="POST">
            <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Tenant Management</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Manage all client workspaces on hrjo.in</p>
          </div>
          <Button
            onClick={() => { setShowCreate(true); setApiError('') }}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 shrink-0"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Tenant
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Tenants', value: stats.total, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Active',        value: stats.active, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Trial',         value: stats.trial, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Suspended',     value: stats.suspended, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(s => (
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
                <p className={`text-3xl font-bold ${s.value > 0 ? s.color : 'text-zinc-600'}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tenant List */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            {tenants.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-zinc-500">
                <Building2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No tenants yet</p>
                <p className="text-xs mt-1">Create your first client workspace</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {tenants.map(t => (
                  <div key={t.id} className="px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-zinc-800/40 transition-colors">
                    {/* Icon */}
                    <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{t.company_name[0].toUpperCase()}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{t.company_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${planColor(t.plan)}`}>
                          {t.plan}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Globe className="w-3 h-3" />{t.slug}.hrjo.in
                        </span>
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />{t.employee_count} / {t.max_employees}
                        </span>
                        <span className="text-zinc-600 text-xs hidden sm:block">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openTenantEmployees(t)}
                        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 px-2 py-1 rounded transition-colors border border-violet-500/20"
                        title="Manage employees"
                      >
                        <Users className="w-3 h-3" /> Manage
                      </button>
                      <a
                        href={`https://${t.slug}.hrjo.in/admin/dashboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
                        title="Open portal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
                        title="Edit tenant"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ── Create Tenant Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Create New Tenant</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Company Name *</Label>
                  <Input
                    placeholder="Acme Corp"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...createForm.register('company_name', {
                      onChange: e => {
                        const slug = slugify(e.target.value)
                        createForm.setValue('slug', slug)
                      }
                    })}
                  />
                  {createForm.formState.errors.company_name && (
                    <p className="text-red-400 text-xs">{createForm.formState.errors.company_name.message}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Subdomain (slug) *</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="acme"
                      className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                      {...createForm.register('slug')}
                    />
                    <span className="text-zinc-500 text-xs whitespace-nowrap">.hrjo.in</span>
                  </div>
                  {createForm.formState.errors.slug && (
                    <p className="text-red-400 text-xs">{createForm.formState.errors.slug.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Plan</Label>
                  <select
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm px-3 focus:border-violet-500 focus:outline-none"
                    {...createForm.register('plan')}
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Max Employees</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...createForm.register('max_employees')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Company Domain <span className="text-zinc-500">(optional — for workspace lookup)</span></Label>
                <Input
                  placeholder="e.g. hykvra.com"
                  className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                  {...createForm.register('company_domain')}
                />
                <p className="text-zinc-500 text-[10px]">Employees use this to find their portal at hrjo.in/find-workspace</p>
              </div>

              <hr className="border-zinc-800" />
              <p className="text-zinc-400 text-xs font-medium">Initial Admin Account</p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Admin Name</Label>
                  <Input
                    placeholder="John Smith"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...createForm.register('admin_name')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Admin Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@acme.com"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...createForm.register('admin_email')}
                  />
                  {createForm.formState.errors.admin_email && (
                    <p className="text-red-400 text-xs">{createForm.formState.errors.admin_email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Admin Password *</Label>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...createForm.register('admin_password')}
                  />
                  {createForm.formState.errors.admin_password && (
                    <p className="text-red-400 text-xs">{createForm.formState.errors.admin_password.message}</p>
                  )}
                </div>
              </div>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2.5">
                  <p className="text-red-400 text-xs">{apiError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createForm.formState.isSubmitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm"
                >
                  {createForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Employee Panel (slide-over) ────────────────────────────────────── */}
      {selectedTenant && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSelectedTenant(null); setShowAddEmployee(false) }}
          />
          {/* Panel */}
          <div className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-semibold text-sm">{selectedTenant.company_name}</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{selectedTenant.slug}.hrjo.in · Employees &amp; Admins</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => { setShowAddEmployee(true); setAddEmpError(''); addEmpForm.reset({ role: 'employee' }) }}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 h-7"
                >
                  <UserPlus className="w-3 h-3" /> Add
                </Button>
                <button
                  onClick={() => { setSelectedTenant(null); setShowAddEmployee(false) }}
                  className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto">
              {empLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-zinc-500">
                  <Users className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No employees yet</p>
                  <p className="text-xs mt-1">Add the first admin or employee</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {employees.map(emp => (
                    <div key={emp.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {(emp.first_name?.[0] || emp.email[0]).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">
                            {emp.first_name || emp.email.split('@')[0]}{emp.last_name ? ` ${emp.last_name}` : ''}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${roleColor(emp.role)}`}>
                            {emp.role.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-xs truncate">{emp.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-zinc-600 text-[10px] hidden sm:block">{emp.employee_code}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${emp.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-zinc-500 bg-zinc-800 border-zinc-700'}`}>
                          {emp.is_active ? 'active' : 'inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-3 border-t border-zinc-800 shrink-0">
              <p className="text-zinc-600 text-xs">{employees.length} of {selectedTenant.max_employees} seats used</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Employee Modal ──────────────────────────────────────────────── */}
      {showAddEmployee && selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold text-sm">Add Employee / Admin</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{selectedTenant.company_name}</p>
              </div>
              <button
                onClick={() => setShowAddEmployee(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={addEmpForm.handleSubmit(onAddEmployee)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">First Name</Label>
                  <Input
                    placeholder="John"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...addEmpForm.register('first_name')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Last Name</Label>
                  <Input
                    placeholder="Smith"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...addEmpForm.register('last_name')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                  {...addEmpForm.register('email')}
                />
                {addEmpForm.formState.errors.email && (
                  <p className="text-red-400 text-xs">{addEmpForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Password *</Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                  {...addEmpForm.register('password')}
                />
                {addEmpForm.formState.errors.password && (
                  <p className="text-red-400 text-xs">{addEmpForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Role *</Label>
                  <select
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm px-3 focus:border-violet-500 focus:outline-none"
                    {...addEmpForm.register('role')}
                  >
                    <option value="employee">Employee</option>
                    <option value="attendance">Attendance</option>
                    <option value="manager">Manager</option>
                    <option value="master_admin">Master Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Employee Code <span className="text-zinc-600">(auto)</span></Label>
                  <Input
                    placeholder="e.g. ACME-001"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:border-violet-500"
                    {...addEmpForm.register('employee_code')}
                  />
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-3 flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  The employee will be able to log in at <span className="text-zinc-300">{selectedTenant.slug}.hrjo.in/login</span> using these credentials. Master admins will see the onboarding wizard on first login.
                </p>
              </div>

              {addEmpError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2.5">
                  <p className="text-red-400 text-xs">{addEmpError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm"
                  onClick={() => setShowAddEmployee(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addEmpForm.formState.isSubmitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm"
                >
                  {addEmpForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ───────────────────────────────────────────────── */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Edit — {editTenant.company_name}</h2>
              <button onClick={() => setEditTenant(null)} className="text-zinc-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Company Name</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white text-sm focus:border-violet-500"
                  {...editForm.register('company_name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Plan</Label>
                  <select
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm px-3 focus:border-violet-500 focus:outline-none"
                    {...editForm.register('plan')}
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-zinc-300 text-xs">Status</Label>
                  <select
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-800 text-white text-sm px-3 focus:border-violet-500 focus:outline-none"
                    {...editForm.register('status')}
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Max Employees</Label>
                <Input
                  type="number"
                  className="bg-zinc-800 border-zinc-700 text-white text-sm focus:border-violet-500"
                  {...editForm.register('max_employees')}
                />
              </div>

              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2.5">
                  <p className="text-red-400 text-xs">{editError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm"
                  onClick={() => setEditTenant(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editForm.formState.isSubmitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm"
                >
                  {editForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
