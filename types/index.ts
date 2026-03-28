export type Role = 'master_admin' | 'manager' | 'attendance' | 'employee'

export interface JWTPayload {
  id: string
  role: Role
  shift_id: string | null
  email: string
}

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  password_hash: string
  mobile: string
  address: string
  dob: string
  gender: string
  blood_group: string
  employee_code: string | null
  role: Role
  shift_id: string | null
  joining_date: string
  base_salary: number
  leave_balance: number
  monthly_leave_quota: number
  profile_photo: string | null
  original_photo: string | null
  bank_name: string | null
  account_no: string | null
  ifsc: string | null
  branch_name: string | null
  account_holder: string | null
  emergency_name: string | null
  emergency_phone: string | null
  resignation_status: boolean
  resignation_date: string | null
  last_working_date: string | null
  increment_message: string | null
  bonus_message: string | null
  total_penalties: number
  is_active: boolean
  first_login: boolean
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
  created_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_date: string
  end_date: string | null
  leave_type: 'Sick' | 'Casual' | 'Earned' | 'Vacation'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  manager_comment: string | null
  exception_flag: boolean
  group_id: string | null
  created_at: string
}

export interface SalaryAdvance {
  id: string
  employee_id: string
  amount: number
  approved_amount: number | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  manager_comment: string | null
  created_at: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  status: 'Present' | 'Absent' | 'HalfDay' | 'Uninformed' | 'DoubleShift' | 'ApprovedLeave'
}

export interface SupportTicket {
  id: string
  employee_id: string
  subject: string
  message: string
  status: 'open' | 'resolved'
  manager_reply: string | null
  created_at: string
}

export interface Broadcast {
  id: string
  message: string
  target_shift: string
  created_by: string
  created_at: string
}

export interface AdminPermissions {
  employee_id: string
  can_approve_leaves: boolean
  can_manage_salary: boolean
  can_view_reports: boolean
  can_manage_shifts: boolean
  can_send_broadcast: boolean
  updated_at: string
}

export interface OTPStore {
  email: string
  otp: string
  expires_at: number
}
