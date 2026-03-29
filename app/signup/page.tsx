'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Zap,
  Loader2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
  company_name: string
  slug: string
  admin_name: string
  admin_email: string
  admin_password: string
  confirm_password: string
  plan: 'starter' | 'pro' | 'enterprise'
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 'Free',
    priceNote: '30-day trial',
    employees: 'Up to 25 employees',
    features: ['Attendance tracking', 'Payroll processing', 'Leave management', 'Email support'],
    color: 'border-zinc-700',
    badge: null,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$29',
    priceNote: 'per month',
    employees: 'Up to 100 employees',
    features: ['Everything in Starter', 'Advanced reports', 'Priority support', 'Custom branding'],
    color: 'border-violet-500',
    badge: 'Popular',
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$99',
    priceNote: 'per month',
    employees: 'Up to 500 employees',
    features: ['Everything in Pro', 'Unlimited managers', 'API access', 'Dedicated support'],
    color: 'border-zinc-700',
    badge: null,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: 'Workspace', icon: Building2 },
    { label: 'Account', icon: User },
    { label: 'Plan', icon: Zap },
  ]
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const Icon = step.icon
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  done
                    ? 'bg-violet-600 text-white'
                    : active
                    ? 'bg-violet-600/20 border-2 border-violet-500 text-violet-400'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-500'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? 'text-violet-400' : done ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 transition-colors ${i < current ? 'bg-violet-600' : 'bg-zinc-800'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    company_name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
    plan: 'starter',
  })
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [slugMessage, setSlugMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  // ── Slug check debounce ───────────────────────────────────────────────────
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle')
      setSlugMessage('')
      return
    }
    setSlugStatus('checking')
    try {
      const res = await fetch(`/api/public/check-slug?slug=${encodeURIComponent(slug)}`)
      const data = await res.json()
      if (data.error) {
        setSlugStatus('invalid')
        setSlugMessage(data.error)
      } else if (data.available) {
        setSlugStatus('available')
        setSlugMessage('Available!')
      } else {
        setSlugStatus('taken')
        setSlugMessage('Already taken')
      }
    } catch {
      setSlugStatus('idle')
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => checkSlug(form.slug), 500)
    return () => clearTimeout(timeout)
  }, [form.slug, checkSlug])

  // ── Field helpers ─────────────────────────────────────────────────────────
  const set = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCompanyChange = (value: string) => {
    set('company_name', value)
    // Auto-fill slug only if user hasn't manually edited it
    if (!form.slug || form.slug === slugify(form.company_name)) {
      set('slug', slugify(value))
    }
  }

  // ── Validation per step ───────────────────────────────────────────────────
  const step0Valid =
    form.company_name.trim().length >= 2 &&
    form.slug.length >= 3 &&
    slugStatus === 'available'

  const step1Valid =
    form.admin_name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email) &&
    form.admin_password.length >= 8 &&
    form.admin_password === form.confirm_password

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          slug: form.slug,
          plan: form.plan,
          admin_name: form.admin_name.trim(),
          admin_email: form.admin_email.toLowerCase().trim(),
          admin_password: form.admin_password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong')
        return
      }
      setDone(true)
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    const portalUrl = `https://${form.slug}.hrjo.in`
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Your portal is ready!</h1>
          <p className="text-zinc-400 mb-6">
            Your <span className="text-white font-medium">{form.company_name}</span> HR workspace has been created.
            Check your email for login details.
          </p>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Your portal URL</p>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 font-semibold flex items-center gap-1 hover:text-violet-300 transition-colors"
            >
              {portalUrl}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <a href={`${portalUrl}/login`}>
            <Button className="w-full bg-violet-600 hover:bg-violet-700 gap-2">
              Go to your portal <ArrowRight className="w-4 h-4" />
            </Button>
          </a>

          <p className="text-zinc-600 text-xs mt-4">
            30-day free trial · No credit card required
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 h-14 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          <span className="font-semibold text-white text-sm">hrjo.in</span>
        </Link>
        <div className="ml-auto text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
            <p className="text-zinc-400 text-sm mt-1">No credit card required · 30 days free</p>
          </div>

          <StepIndicator current={step} total={3} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            {/* ── Step 0: Company info ───────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Name your workspace</h2>
                  <p className="text-sm text-zinc-400">This will be your company&apos;s HR portal.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company name</Label>
                  <Input
                    id="company_name"
                    placeholder="Acme Corp"
                    value={form.company_name}
                    onChange={e => handleCompanyChange(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug">Workspace URL</Label>
                  <div className="flex items-center gap-0">
                    <Input
                      id="slug"
                      placeholder="acme"
                      value={form.slug}
                      onChange={e => set('slug', slugify(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 rounded-r-none"
                    />
                    <div className="bg-zinc-700 border border-zinc-700 border-l-0 rounded-r-lg px-3 h-9 flex items-center text-sm text-zinc-400 whitespace-nowrap shrink-0">
                      .hrjo.in
                    </div>
                  </div>

                  {/* Slug status */}
                  <div className="flex items-center gap-1.5 text-xs mt-1 h-4">
                    {slugStatus === 'checking' && (
                      <><Loader2 className="w-3 h-3 animate-spin text-zinc-400" /><span className="text-zinc-400">Checking…</span></>
                    )}
                    {slugStatus === 'available' && (
                      <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">{slugMessage}</span></>
                    )}
                    {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                      <><X className="w-3 h-3 text-red-400" /><span className="text-red-400">{slugMessage}</span></>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                  disabled={!step0Valid}
                  onClick={() => setStep(1)}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ── Step 1: Admin account ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Create your admin account</h2>
                  <p className="text-sm text-zinc-400">You&apos;ll use these credentials to log in.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin_name">Full name</Label>
                  <Input
                    id="admin_name"
                    placeholder="Jane Smith"
                    value={form.admin_name}
                    onChange={e => set('admin_name', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin_email">Work email</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    placeholder="jane@acmecorp.com"
                    value={form.admin_email}
                    onChange={e => set('admin_email', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin_password">Password</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.admin_password}
                    onChange={e => set('admin_password', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">Confirm password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Repeat password"
                    value={form.confirm_password}
                    onChange={e => set('confirm_password', e.target.value)}
                    className={`bg-zinc-800 border-zinc-700 ${
                      form.confirm_password && form.confirm_password !== form.admin_password
                        ? 'border-red-500'
                        : ''
                    }`}
                  />
                  {form.confirm_password && form.confirm_password !== form.admin_password && (
                    <p className="text-xs text-red-400">Passwords don&apos;t match</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700 gap-2"
                    onClick={() => setStep(0)}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Plan + review + submit ────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Choose a plan</h2>
                  <p className="text-sm text-zinc-400">All plans start with a 30-day free trial.</p>
                </div>

                <div className="space-y-3">
                  {PLANS.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => set('plan', plan.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors ${
                        form.plan === plan.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white text-sm">{plan.name}</span>
                            {plan.badge && (
                              <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-medium">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mb-2">{plan.employees}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {plan.features.map(f => (
                              <span key={f} className="text-xs text-zinc-400 flex items-center gap-1">
                                <Check className="w-3 h-3 text-zinc-500" />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-white">{plan.price}</div>
                          <div className="text-xs text-zinc-500">{plan.priceNote}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Review summary */}
                <div className="bg-zinc-800 rounded-xl p-4 text-sm space-y-2">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-medium mb-3">Review</p>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Workspace</span>
                    <span className="text-white font-medium">{form.slug}.hrjo.in</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Company</span>
                    <span className="text-white">{form.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Admin email</span>
                    <span className="text-white">{form.admin_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Plan</span>
                    <span className="text-white capitalize">{form.plan}</span>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700 gap-2"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    ) : (
                      <>Create workspace <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>

                <p className="text-center text-xs text-zinc-600">
                  By signing up you agree to our terms of service.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
