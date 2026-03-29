'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Ban, Zap, ArrowRight, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getSubscriptionInfo,
  PLAN_LABELS,
  PLAN_COLORS,
  PLAN_FEATURES,
  type PlanId,
  type SubscriptionInfo,
} from '@/lib/subscription'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantData {
  id: string
  slug: string
  company_name: string
  plan: string
  status: string
  max_employees: number
  trial_ends_at: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ info }: { info: SubscriptionInfo }) {
  if (info.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Active
      </span>
    )
  }
  if (info.status === 'trial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
        <Clock className="w-3 h-3" /> Trial — {info.trialDaysLeft}d left
      </span>
    )
  }
  if (info.status === 'trial_expired') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
        <Clock className="w-3 h-3" /> Trial expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
      <Ban className="w-3 h-3" /> Suspended
    </span>
  )
}

function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-violet-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Employee usage
        </span>
        <span className={`font-medium ${pct >= 90 ? 'text-red-400' : 'text-zinc-300'}`}>
          {used} / {max}
        </span>
      </div>
      <div className="w-full bg-zinc-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 90 && (
        <p className="text-xs text-red-400">
          {max - used <= 0
            ? 'Employee limit reached — upgrade to add more'
            : `Only ${max - used} slot${max - used === 1 ? '' : 's'} remaining`}
        </p>
      )}
    </div>
  )
}

// ── Plan comparison ───────────────────────────────────────────────────────────

const PLANS: { id: PlanId; price: string; priceNote: string }[] = [
  { id: 'starter',    price: 'Free',  priceNote: '30-day trial' },
  { id: 'pro',        price: '$29',   priceNote: '/month'       },
  { id: 'enterprise', price: '$99',   priceNote: '/month'       },
]

function PlanCard({ planId, currentPlan }: { planId: PlanId; currentPlan: PlanId }) {
  const plan = PLANS.find(p => p.id === planId)!
  const isCurrent = planId === currentPlan
  const isUpgrade =
    (currentPlan === 'starter' && planId !== 'starter') ||
    (currentPlan === 'pro' && planId === 'enterprise')

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 ${
        isCurrent
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-zinc-700 bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {isCurrent && (
            <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-medium block w-fit mb-1.5">
              Current plan
            </span>
          )}
          <p className="font-semibold text-white text-sm">{PLAN_LABELS[planId]}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-white text-base">{plan.price}</p>
          <p className="text-[11px] text-zinc-500">{plan.priceNote}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {PLAN_FEATURES[planId].map(f => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-zinc-400">
            <CheckCircle2 className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {isUpgrade && (
        <a
          href={`mailto:support@hrjo.in?subject=Plan%20Upgrade%20Request%20to%20${PLAN_LABELS[planId]}`}
          className="mt-auto"
        >
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs bg-violet-600 hover:bg-violet-700"
          >
            Upgrade to {PLAN_LABELS[planId]} <ArrowRight className="w-3 h-3" />
          </Button>
        </a>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BillingPanel() {
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing')
      .then(r => r.json())
      .then(d => {
        setTenant(d.tenant ?? null)
        setEmployeeCount(d.employeeCount ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <p className="text-zinc-500 text-sm py-4">Could not load billing information.</p>
    )
  }

  const info = getSubscriptionInfo(tenant)
  const currentPlan = info.plan

  return (
    <div className="space-y-6">

      {/* ── Current plan summary ─────────────────────────────────────── */}
      <div className="bg-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[currentPlan]}`}>
              {PLAN_LABELS[currentPlan]}
            </span>
            <StatusBadge info={info} />
          </div>
          <p className="text-white font-semibold">{tenant.company_name}</p>
          <p className="text-zinc-400 text-xs font-mono">{tenant.slug}.hrjo.in</p>
        </div>
        <div className="shrink-0 text-right">
          {info.trialEndsAt && info.status === 'trial' && (
            <div>
              <p className="text-xs text-zinc-500">Trial ends</p>
              <p className="text-sm font-medium text-amber-400">
                {new Date(info.trialEndsAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          )}
          {info.status === 'active' && (
            <div>
              <p className="text-xs text-zinc-500">Member since</p>
              <p className="text-sm font-medium text-zinc-300">
                {new Date(tenant.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Trial / restriction alerts ───────────────────────────────── */}
      {info.status === 'trial' && info.trialDaysLeft !== null && info.trialDaysLeft <= 7 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Trial expires in {info.trialDaysLeft} day{info.trialDaysLeft === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Upgrade before your trial ends to avoid losing access. Contact{' '}
              <a href="mailto:support@hrjo.in" className="underline">support@hrjo.in</a> to upgrade.
            </p>
          </div>
        </div>
      )}

      {info.status === 'suspended' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <Ban className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Workspace suspended</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Contact <a href="mailto:support@hrjo.in" className="underline">support@hrjo.in</a> to reinstate access.
            </p>
          </div>
        </div>
      )}

      {/* ── Usage bar ────────────────────────────────────────────────── */}
      <div className="bg-zinc-800 rounded-xl p-4">
        <UsageBar used={employeeCount} max={info.maxEmployees} />
      </div>

      {/* ── Plan comparison ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-violet-400" />
          <p className="text-zinc-300 text-sm font-medium">Plans</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {PLANS.map(p => (
            <PlanCard key={p.id} planId={p.id} currentPlan={currentPlan} />
          ))}
        </div>
      </div>

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500 text-center">
          Questions about your plan?{' '}
          <a href="mailto:support@hrjo.in" className="text-violet-400 hover:text-violet-300 underline">
            support@hrjo.in
          </a>
        </p>
      </div>
    </div>
  )
}
