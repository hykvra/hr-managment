'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// ── Schemas ──────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type LoginData = z.infer<typeof loginSchema>
type ForgotData = z.infer<typeof forgotSchema>
type OTPData = z.infer<typeof otpSchema>

type Step = 'login' | 'forgot' | 'otp'

// ── Component ─────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const forgotForm = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) })
  const otpForm = useForm<OTPData>({ resolver: zodResolver(otpSchema) })

  // ── Login submit ───────────────────────────────────────────
  async function onLogin(data: LoginData) {
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Login failed')
      return
    }

    // Route based on role
    const adminRoles = ['master_admin', 'manager', 'attendance']
    if (adminRoles.includes(json.role)) {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  // ── Forgot password submit ─────────────────────────────────
  async function onForgot(data: ForgotData) {
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      setError('Failed to send OTP. Please try again.')
      return
    }
    setForgotEmail(data.email)
    setSuccess('OTP sent to your email. Check your inbox.')
    setStep('otp')
  }

  // ── OTP + reset submit ─────────────────────────────────────
  async function onOTP(data: OTPData) {
    setError('')
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, otp: data.otp, new_password: data.new_password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'OTP verification failed')
      return
    }
    setSuccess('Password reset successful! You can now log in.')
    setStep('login')
    loginForm.setValue('email', forgotEmail)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">E</span>
          </div>
          <h1 className="text-xl font-bold text-white">ESAM HR Portal</h1>
        </div>

        {/* ── Login Card ── */}
        {step === 'login' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the portal</CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-md p-3 mb-4">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    {...loginForm.register('email')}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-xs">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className="bg-zinc-800 border-zinc-700 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-400 text-xs">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setError(''); setSuccess(''); setStep('forgot') }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>

              <p className="text-center text-sm text-zinc-400 mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-blue-400 hover:text-blue-300">
                  Register
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Forgot Password Card ── */}
        {step === 'forgot' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Forgot Password</CardTitle>
              <CardDescription>Enter your email to receive a 6-digit OTP</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@company.com"
                    {...forgotForm.register('email')}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {forgotForm.formState.errors.email && (
                    <p className="text-red-400 text-xs">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotForm.formState.isSubmitting}
                >
                  {forgotForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Send OTP
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setError(''); setStep('login') }}
                className="w-full text-center text-sm text-zinc-400 hover:text-zinc-300 mt-4"
              >
                ← Back to sign in
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── OTP Verification Card ── */}
        {step === 'otp' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Reset Password</CardTitle>
              <CardDescription>
                Enter the OTP sent to <span className="text-zinc-300">{forgotEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm rounded-md p-3 mb-4">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={otpForm.handleSubmit(onOTP)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp">6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    {...otpForm.register('otp')}
                    className="bg-zinc-800 border-zinc-700 tracking-[0.5em] text-center text-lg"
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-red-400 text-xs">{otpForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      {...otpForm.register('new_password')}
                      className="bg-zinc-800 border-zinc-700 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {otpForm.formState.errors.new_password && (
                    <p className="text-red-400 text-xs">
                      {otpForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat password"
                    {...otpForm.register('confirm_password')}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  {otpForm.formState.errors.confirm_password && (
                    <p className="text-red-400 text-xs">
                      {otpForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={otpForm.formState.isSubmitting}
                >
                  {otpForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Reset Password
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setError(''); setSuccess(''); setStep('forgot') }}
                className="w-full text-center text-sm text-zinc-400 hover:text-zinc-300 mt-4"
              >
                ← Resend OTP
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
