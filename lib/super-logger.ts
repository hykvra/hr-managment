import { supabaseAdmin } from '@/lib/supabase'

export type LogAction =
  | 'create_tenant'
  | 'edit_tenant'
  | 'delete_tenant'
  | 'suspend_tenant'
  | 'activate_tenant'
  | 'add_employee'
  | 'delete_employee'
  | 'toggle_employee'
  | 'super_login'
  | 'super_logout'

export async function superLog(opts: {
  action: LogAction
  entity_type: 'tenant' | 'employee' | 'auth'
  entity_id?: string
  entity_name?: string
  details?: Record<string, unknown>
  performed_by: string
}) {
  try {
    await supabaseAdmin.from('super_admin_logs').insert({
      action: opts.action,
      entity_type: opts.entity_type,
      entity_id: opts.entity_id ?? null,
      entity_name: opts.entity_name ?? null,
      details: opts.details ?? {},
      performed_by: opts.performed_by,
    })
  } catch (e) {
    // Non-blocking — log errors should never break the main flow
    console.error('[super-logger] failed to write log:', e)
  }
}
