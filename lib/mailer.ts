import { Resend } from 'resend'

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!)
}

function getFrom(): string {
  return `${process.env.FROM_NAME || 'E-Sam HR'} <${process.env.FROM_EMAIL || 'noreply@esam.hr'}>`
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: 'Your ESAM HR Password Reset OTP',
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
