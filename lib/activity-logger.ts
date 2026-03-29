/**
 * Unified activity logger — writes to the `activity_logs` table.
 * Used throughout the app (auth, attendance, leaves, payroll, etc.)
 * as well as by super admin actions.
 *
 * All calls are fire-and-forget — errors are caught and logged to console
 * so they never break the main request flow.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

export type ActivityAction =
  // ── Auth ─────────────────────────────────────────────────────────────────
  | 'employee_login'
  | 'employee_login_failed'
  | 'employee_logout'
  | 'employee_register'
  | 'password_reset_otp'
  | 'password_reset_complete'
  | 'super_admin_login'
  | 'super_admin_login_failed'
  | 'super_admin_logout'
  // ── Attendance ────────────────────────────────────────────────────────────
  | 'attendance_saved'
  // ── Leaves ───────────────────────────────────────────────────────────────
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  // ── Payroll ───────────────────────────────────────────────────────────────
  | 'payroll_generated'
  | 'payroll_paid'
  // ── Employees ────────────────────────────────────────────────────────────
  | 'employee_approved'
  | 'employee_rejected'
  | 'employee_salary_updated'
  | 'employee_deactivated'
  | 'employee_reactivated'
  // ── Advances ─────────────────────────────────────────────────────────────
  | 'advance_requested'
  | 'advance_approved'
  | 'advance_rejected'
  // ── Resignation ──────────────────────────────────────────────────────────
  | 'resignation_submitted'
  | 'resignation_withdrawn'
  // ── Super admin — tenant management ───────────────────────────────────────
  | 'tenant_created'
  | 'tenant_edited'
  | 'tenant_deleted'
  | 'tenant_suspended'
  | 'tenant_activated'
  | 'super_employee_added'

export interface LogOptions {
  action: ActivityAction
  tenant_id?: string | null
  tenant_slug?: string | null
  actor_id?: string | null
  actor_email?: string
  actor_role?: string
  entity_type?: string
  entity_id?: string | null
  entity_name?: string | null
  details?: Record<string, unknown>
  req?: NextRequest | Request
}

/** Extract IP from request headers (best effort). */
function getIp(req?: NextRequest | Request): string | null {
  if (!req) return null
  const h = req.headers
  return (
    (h as Headers).get?.('x-real-ip') ??
    (h as Headers).get?.('x-forwarded-for')?.split(',')[0].trim() ??
    null
  )
}

/** Write one activity log entry — non-blocking, never throws. */
export async function activityLog(opts: LogOptions): Promise<void> {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      tenant_id:   opts.tenant_id   ?? null,
      tenant_slug: opts.tenant_slug ?? null,
      actor_id:    opts.actor_id    ?? null,
      actor_email: opts.actor_email ?? null,
      actor_role:  opts.actor_role  ?? null,
      action:      opts.action,
      entity_type: opts.entity_type ?? null,
      entity_id:   opts.entity_id   ?? null,
      entity_name: opts.entity_name ?? null,
      details:     opts.details     ?? {},
      ip_address:  getIp(opts.req),
    })
  } catch (e) {
    console.error('[activity-logger] failed to write log:', e)
  }
}
