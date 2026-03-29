export type PlanId = 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trial' | 'trial_expired' | 'suspended'

export interface SubscriptionInfo {
  status: SubscriptionStatus
  plan: PlanId
  trialDaysLeft: number | null   // null when not on a trial
  trialEndsAt: string | null
  maxEmployees: number
  isRestricted: boolean          // true when suspended or trial_expired
}

// ── Plan metadata ─────────────────────────────────────────────────────────────

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export const PLAN_COLORS: Record<PlanId, string> = {
  starter: 'text-zinc-300 bg-zinc-700/60',
  pro: 'text-violet-300 bg-violet-500/20',
  enterprise: 'text-amber-300 bg-amber-500/20',
}

export const PLAN_MAX_EMPLOYEES: Record<PlanId, number> = {
  starter: 25,
  pro: 100,
  enterprise: 500,
}

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: ['Attendance tracking', 'Payroll processing', 'Leave management', 'Email support', 'Up to 25 employees'],
  pro: ['Everything in Starter', 'Advanced reports', 'Priority support', 'Custom branding', 'Up to 100 employees'],
  enterprise: ['Everything in Pro', 'Unlimited managers', 'API access', 'Dedicated support', 'Up to 500 employees'],
}

// ── Core status resolver ──────────────────────────────────────────────────────

export function getSubscriptionInfo(tenant: {
  status: string
  plan: string
  trial_ends_at: string | null
  max_employees: number
}): SubscriptionInfo {
  const plan = (tenant.plan || 'starter') as PlanId
  const maxEmployees = tenant.max_employees

  if (tenant.status === 'suspended') {
    return {
      status: 'suspended',
      plan,
      trialDaysLeft: null,
      trialEndsAt: tenant.trial_ends_at,
      maxEmployees,
      isRestricted: true,
    }
  }

  if (tenant.status === 'trial' && tenant.trial_ends_at) {
    const msLeft = new Date(tenant.trial_ends_at).getTime() - Date.now()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) {
      return {
        status: 'trial_expired',
        plan,
        trialDaysLeft: 0,
        trialEndsAt: tenant.trial_ends_at,
        maxEmployees,
        isRestricted: true,
      }
    }

    return {
      status: 'trial',
      plan,
      trialDaysLeft: daysLeft,
      trialEndsAt: tenant.trial_ends_at,
      maxEmployees,
      isRestricted: false,
    }
  }

  return {
    status: 'active',
    plan,
    trialDaysLeft: null,
    trialEndsAt: tenant.trial_ends_at,
    maxEmployees,
    isRestricted: false,
  }
}
