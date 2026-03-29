/**
 * super-logger — thin wrapper kept for backward compatibility.
 * All writes now go through activity-logger → activity_logs table.
 */

import { activityLog, ActivityAction } from '@/lib/activity-logger'

export type LogAction =
  | 'create_tenant' | 'edit_tenant' | 'delete_tenant'
  | 'suspend_tenant' | 'activate_tenant'
  | 'add_employee'   | 'delete_employee' | 'toggle_employee'
  | 'super_login'    | 'super_logout'

// Map old LogAction names → new ActivityAction names
const ACTION_MAP: Record<LogAction, ActivityAction> = {
  create_tenant:   'tenant_created',
  edit_tenant:     'tenant_edited',
  delete_tenant:   'tenant_deleted',
  suspend_tenant:  'tenant_suspended',
  activate_tenant: 'tenant_activated',
  add_employee:    'super_employee_added',
  delete_employee: 'employee_deactivated',
  toggle_employee: 'employee_reactivated',
  super_login:     'super_admin_login',
  super_logout:    'super_admin_logout',
}

export async function superLog(opts: {
  action: LogAction
  entity_type: 'tenant' | 'employee' | 'auth'
  entity_id?: string
  entity_name?: string
  details?: Record<string, unknown>
  performed_by: string
}) {
  await activityLog({
    action:       ACTION_MAP[opts.action] ?? opts.action as ActivityAction,
    entity_type:  opts.entity_type,
    entity_id:    opts.entity_id,
    entity_name:  opts.entity_name,
    details:      opts.details,
    actor_email:  opts.performed_by,
    actor_role:   'super_admin',
  })
}
