import { Resend } from 'resend'

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!)
}

function getFrom(): string {
  return `${process.env.FROM_NAME || 'E-Sam HR'} <${process.env.FROM_EMAIL || 'noreply@esam.hr'}>`
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const { data, error } = await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: 'Your hrjo.in HR Portal — Password Reset OTP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#18181b;color:#fafafa;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#3b82f6;">Password Reset</h2>
        <p style="color:#a1a1aa;margin:0 0 24px;">Use the OTP below to reset your password. It expires in 10 minutes.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;background:#27272a;padding:20px;border-radius:8px;color:#fafafa;">
          ${otp}
        </div>
        <p style="color:#71717a;margin:24px 0 0;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
  if (error) {
    console.error('[mailer] sendOTPEmail failed:', JSON.stringify(error))
    throw new Error(error.message)
  }
  console.log('[mailer] sendOTPEmail sent, id:', data?.id)
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: 'Welcome to ESAM HR Portal',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#18181b;color:#fafafa;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#3b82f6;">Welcome, ${name}!</h2>
        <p style="color:#a1a1aa;">Your registration has been received. An admin will review and activate your account shortly.</p>
        <p style="color:#71717a;margin-top:24px;font-size:12px;">ESAM HR Portal</p>
      </div>
    `,
  })
}

// ── Payslip Email ─────────────────────────────────────────────────────────────

type PayslipRecord = {
  month: string
  base_salary: number
  days_present: number; days_half: number; days_double: number
  days_absent: number; days_uninformed: number; days_leave: number
  payable_days: number
  gross_salary: number
  total_allowances?: number
  penalty_deduction: number
  advance_deduction: number
  loan_deduction?: number
  total_component_deductions?: number
  pf_employee?: number
  esi_employee?: number
  pf_employer?: number
  ot_pay?: number
  bonus: number
  net_salary: number
  notes?: string | null
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function fmtINR(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

function payslipRow(label: string, value: string, color = '#a1a1aa') {
  return `<tr>
    <td style="padding:4px 0;color:#a1a1aa;font-size:13px;border-bottom:1px solid #3f3f46">${label}</td>
    <td style="padding:4px 0;text-align:right;font-size:13px;font-weight:600;color:${color};border-bottom:1px solid #3f3f46">${value}</td>
  </tr>`
}

export async function sendPayslipEmail(
  email: string,
  firstName: string,
  r: PayslipRecord,
): Promise<void> {
  const d = new Date(r.month)
  const monthLabel = `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`

  const earningsSection = [
    payslipRow('Gross Salary', fmtINR(r.gross_salary), '#fafafa'),
    (r.total_allowances || 0) > 0
      ? payslipRow('Allowances (HRA, TA…)', `+${fmtINR(r.total_allowances!)}`, '#4ade80') : '',
    (r.ot_pay || 0) > 0
      ? payslipRow('Overtime Pay',          `+${fmtINR(r.ot_pay!)}`,          '#4ade80') : '',
    r.bonus > 0
      ? payslipRow('Bonus',                 `+${fmtINR(r.bonus)}`,            '#4ade80') : '',
  ].join('')

  const deductSection = [
    r.penalty_deduction > 0
      ? payslipRow('Uninformed Penalty',  `−${fmtINR(r.penalty_deduction)}`,         '#f87171') : '',
    r.advance_deduction > 0
      ? payslipRow('Advance Deduction',   `−${fmtINR(r.advance_deduction)}`,         '#fbbf24') : '',
    (r.loan_deduction || 0) > 0
      ? payslipRow('Loan EMI',            `−${fmtINR(r.loan_deduction!)}`,           '#f87171') : '',
    (r.total_component_deductions || 0) > 0
      ? payslipRow('Other Deductions',    `−${fmtINR(r.total_component_deductions!)}`, '#f87171') : '',
    (r.pf_employee || 0) > 0
      ? payslipRow('PF (Employee 12%)',   `−${fmtINR(r.pf_employee!)}`,             '#94a3b8') : '',
    (r.esi_employee || 0) > 0
      ? payslipRow('ESI (Employee 0.75%)',`−${fmtINR(r.esi_employee!)}`,            '#94a3b8') : '',
  ].join('')

  const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#18181b;color:#fafafa;border-radius:12px;padding:32px;">
  <h2 style="margin:0 0 4px;color:#3b82f6;font-size:20px;">Salary Payslip</h2>
  <p style="color:#a1a1aa;margin:0 0 24px;font-size:13px;">Hi ${firstName}, here is your payslip for <strong style="color:#fafafa">${monthLabel}</strong>.</p>

  <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:12px;">
    <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px">Attendance</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      <div style="background:#3f3f46;border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#71717a;margin-bottom:2px">Present</div>
        <div style="font-weight:bold;font-size:16px">${r.days_present}</div>
      </div>
      <div style="background:#3f3f46;border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#71717a;margin-bottom:2px">Payable Days</div>
        <div style="font-weight:bold;font-size:16px">${r.payable_days}</div>
      </div>
      <div style="background:#3f3f46;border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:#71717a;margin-bottom:2px">Base Salary</div>
        <div style="font-weight:bold;font-size:14px">${fmtINR(r.base_salary)}</div>
      </div>
    </div>
  </div>

  <div style="background:#27272a;border-radius:8px;padding:16px;margin-bottom:12px;">
    <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px">Earnings &amp; Deductions</p>
    <table style="width:100%;border-collapse:collapse">${earningsSection}${deductSection}</table>
  </div>

  <div style="background:#2563eb;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
    <p style="color:#bfdbfe;margin:0 0 4px;font-size:12px;">Net Pay for ${monthLabel}</p>
    <p style="font-size:30px;font-weight:bold;color:#fff;margin:0;">${fmtINR(r.net_salary)}</p>
  </div>

  ${r.notes ? `<p style="color:#71717a;font-size:12px;margin:0 0 12px">📝 ${r.notes}</p>` : ''}
  <p style="color:#52525b;font-size:11px;margin:0;">System-generated payslip from ESAM HR Portal. Contact HR for queries.</p>
</div>`

  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: `Your Payslip for ${monthLabel} — ESAM HR`,
    html,
  })
}

export async function sendTenantWelcomeEmail(
  email: string,
  adminName: string,
  companyName: string,
  slug: string
): Promise<void> {
  const portalUrl = `https://${slug}.hrjo.in`
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: `Your ${companyName} HR portal is ready — hrjo.in`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#18181b;color:#fafafa;border-radius:12px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-weight:700;font-size:14px;">H</span>
          </div>
          <span style="font-weight:600;color:#fafafa;font-size:16px;">hrjo.in</span>
        </div>
        <h2 style="margin:0 0 8px;color:#fafafa;font-size:22px;">Welcome, ${adminName}!</h2>
        <p style="color:#a1a1aa;margin:0 0 24px;">Your <strong style="color:#fafafa;">${companyName}</strong> HR portal has been created and is ready to use.</p>
        <div style="background:#27272a;border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="color:#71717a;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;">Your Portal URL</p>
          <a href="${portalUrl}" style="color:#7c3aed;font-size:18px;font-weight:600;text-decoration:none;">${portalUrl}</a>
        </div>
        <a href="${portalUrl}/admin/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Open Admin Dashboard →
        </a>
        <p style="color:#52525b;margin-top:24px;font-size:12px;">
          Your 30-day free trial has started. No credit card required.<br/>
          Questions? Reply to this email.
        </p>
      </div>
    `,
  })
}

// ── Leave Notification Email ───────────────────────────────────────────────────

export async function sendLeaveNotificationEmail(
  email: string,
  name: string,
  action: 'approved' | 'rejected',
  leaveType: string,
  leaveDate: string,
  comment?: string | null,
): Promise<void> {
  const isApproved = action === 'approved'
  const color = isApproved ? '#22c55e' : '#ef4444'
  const label = isApproved ? 'Approved ✓' : 'Rejected ✗'
  try {
    await getResend().emails.send({
      from: getFrom(),
      to: email,
      subject: `Leave ${label} — ${leaveType}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#18181b;color:#fafafa;border-radius:12px;">
          <h2 style="margin:0 0 8px;color:${color};">Leave ${label}</h2>
          <p style="color:#a1a1aa;margin:0 0 16px;">Hi ${name}, your leave request has been <strong style="color:${color}">${action}</strong>.</p>
          <div style="background:#27272a;padding:16px;border-radius:8px;margin-bottom:16px;">
            <div style="margin-bottom:8px;"><span style="color:#71717a;font-size:12px;">Leave Type</span><br><span style="color:#fafafa;">${leaveType}</span></div>
            <div><span style="color:#71717a;font-size:12px;">Date</span><br><span style="color:#fafafa;">${new Date(leaveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
          </div>
          ${comment ? `<p style="color:#a1a1aa;font-size:13px;border-left:3px solid ${color};padding-left:12px;margin:0 0 16px;">${comment}</p>` : ''}
          <p style="color:#71717a;font-size:12px;margin:0;">ESAM HR Portal</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[mailer] sendLeaveNotificationEmail failed:', e)
  }
}

// ── Advance Notification Email ────────────────────────────────────────────────

export async function sendAdvanceNotificationEmail(
  email: string,
  name: string,
  action: 'approved' | 'rejected',
  requestedAmount: number,
  approvedAmount?: number | null,
  comment?: string | null,
): Promise<void> {
  const isApproved = action === 'approved'
  const color = isApproved ? '#22c55e' : '#ef4444'
  const label = isApproved ? 'Approved ✓' : 'Rejected ✗'
  try {
    await getResend().emails.send({
      from: getFrom(),
      to: email,
      subject: `Salary Advance ${label}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#18181b;color:#fafafa;border-radius:12px;">
          <h2 style="margin:0 0 8px;color:${color};">Salary Advance ${label}</h2>
          <p style="color:#a1a1aa;margin:0 0 16px;">Hi ${name}, your salary advance request has been <strong style="color:${color}">${action}</strong>.</p>
          <div style="background:#27272a;padding:16px;border-radius:8px;margin-bottom:16px;">
            <div style="margin-bottom:8px;"><span style="color:#71717a;font-size:12px;">Requested</span><br><span style="color:#fafafa;">₹${Math.round(requestedAmount).toLocaleString('en-IN')}</span></div>
            ${isApproved && approvedAmount ? `<div><span style="color:#71717a;font-size:12px;">Approved Amount</span><br><span style="color:#22c55e;font-size:18px;font-weight:700;">₹${Math.round(approvedAmount).toLocaleString('en-IN')}</span></div>` : ''}
          </div>
          ${comment ? `<p style="color:#a1a1aa;font-size:13px;border-left:3px solid ${color};padding-left:12px;margin:0 0 16px;">${comment}</p>` : ''}
          <p style="color:#71717a;font-size:12px;margin:0;">ESAM HR Portal</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[mailer] sendAdvanceNotificationEmail failed:', e)
  }
}
