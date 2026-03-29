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
