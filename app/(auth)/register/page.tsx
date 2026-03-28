'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Upload, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ── Schema ────────────────────────────────────────────────────
const registerSchema = z.object({
  // Section 1: Personal
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  blood_group: z.string().optional(),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  address: z.string().min(5, 'Address is required'),
  // Section 2: Emergency
  emergency_name: z.string().optional(),
  emergency_phone: z.string().optional(),
  // Section 3: Bank
  bank_name: z.string().optional(),
  account_no: z.string().optional(),
  ifsc: z.string().optional(),
  branch_name: z.string().optional(),
  account_holder: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type RegisterData = z.infer<typeof registerSchema>

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Basic personal details' },
  { id: 2, title: 'Contact & Auth', description: 'Mobile, address & password' },
  { id: 3, title: 'Emergency', description: 'Emergency contact' },
  { id: 4, title: 'Bank Details', description: 'For salary payment' },
  { id: 5, title: 'Documents', description: 'Photo upload' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  // ── Step validation fields ─────────────────────────────────
  const stepFields: Record<number, (keyof RegisterData)[]> = {
    1: ['first_name', 'last_name', 'dob', 'gender'],
    2: ['email', 'password', 'confirm_password', 'mobile', 'address'],
    3: [],
    4: [],
    5: [],
  }

  async function goNext() {
    const fields = stepFields[step]
    const valid = fields.length === 0 || (await trigger(fields))
    if (valid) setStep((s) => Math.min(s + 1, 5))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1))
  }

  // ── Photo upload ───────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5MB')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        setUploadError(json.error || 'Upload failed. Please try again.')
        return
      }

      setProfilePhotoUrl(json.url)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Final submit ───────────────────────────────────────────
  async function onSubmit(data: RegisterData) {
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        profile_photo: profilePhotoUrl || null,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Registration failed')
      return
    }

    setDone(true)
  }

  // ── Success screen ─────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold text-white">Registration Submitted!</h2>
            <p className="text-zinc-400 text-sm max-w-xs">
              Your account is pending admin review. You will receive an email once your account is
              activated.
            </p>
            <Button onClick={() => router.push('/login')} className="mt-4">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-lg font-bold text-white">ESAM HR — Employee Registration</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s.id
                    ? 'bg-green-600 text-white'
                    : step === s.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {step > s.id ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 transition-colors ${
                    step > s.id ? 'bg-green-600' : 'bg-zinc-700'
                  }`}
                  style={{ width: '20px' }}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">{STEPS[step - 1].title}</CardTitle>
            <CardDescription>{STEPS[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* ── Step 1: Personal ── */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>First Name *</Label>
                      <Input
                        placeholder="John"
                        {...register('first_name')}
                        className="bg-zinc-800 border-zinc-700"
                      />
                      {errors.first_name && (
                        <p className="text-red-400 text-xs">{errors.first_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Doe"
                        {...register('last_name')}
                        className="bg-zinc-800 border-zinc-700"
                      />
                      {errors.last_name && (
                        <p className="text-red-400 text-xs">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      {...register('dob')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {errors.dob && <p className="text-red-400 text-xs">{errors.dob.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Gender *</Label>
                      <Select onValueChange={(v) => setValue('gender', v)}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-red-400 text-xs">{errors.gender.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Blood Group</Label>
                      <Select onValueChange={(v) => setValue('blood_group', v)}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Contact & Auth ── */}
              {step === 2 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      {...register('email')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        {...register('password')}
                        className="bg-zinc-800 border-zinc-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Confirm Password *</Label>
                    <Input
                      type="password"
                      placeholder="Repeat password"
                      {...register('confirm_password')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {errors.confirm_password && (
                      <p className="text-red-400 text-xs">{errors.confirm_password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Mobile Number *</Label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      {...register('mobile')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                    {errors.mobile && (
                      <p className="text-red-400 text-xs">{errors.mobile.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Address *</Label>
                    <textarea
                      placeholder="Full residential address"
                      {...register('address')}
                      rows={3}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                    {errors.address && (
                      <p className="text-red-400 text-xs">{errors.address.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 3: Emergency Contact ── */}
              {step === 3 && (
                <>
                  <p className="text-sm text-zinc-400 mb-2">
                    Emergency contact details (optional but recommended).
                  </p>
                  <div className="space-y-1.5">
                    <Label>Contact Name</Label>
                    <Input
                      placeholder="e.g. Parent / Spouse name"
                      {...register('emergency_name')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      {...register('emergency_phone')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </>
              )}

              {/* ── Step 4: Bank Details ── */}
              {step === 4 && (
                <>
                  <p className="text-sm text-zinc-400 mb-2">
                    Bank details for salary payment (optional, can be updated later).
                  </p>
                  <div className="space-y-1.5">
                    <Label>Account Holder Name</Label>
                    <Input
                      placeholder="As per bank records"
                      {...register('account_holder')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="e.g. State Bank of India"
                      {...register('bank_name')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Account Number</Label>
                      <Input
                        placeholder="000000000000"
                        {...register('account_no')}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>IFSC Code</Label>
                      <Input
                        placeholder="SBIN0001234"
                        {...register('ifsc')}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Branch Name</Label>
                    <Input
                      placeholder="e.g. Andheri West"
                      {...register('branch_name')}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </>
              )}

              {/* ── Step 5: Photo Upload ── */}
              {step === 5 && (
                <>
                  <p className="text-sm text-zinc-400 mb-4">
                    Upload your profile photo (optional). Max 5MB, JPEG/PNG.
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    {profilePhotoUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profilePhotoUrl}
                          alt="Profile preview"
                          className="w-28 h-28 rounded-full object-cover border-2 border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setProfilePhotoUrl('')}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-zinc-500" />
                      </div>
                    )}

                    <label className="cursor-pointer">
                      <span className="sr-only">Upload photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        asChild
                      >
                        <span>
                          {uploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                          ) : profilePhotoUrl ? (
                            'Change Photo'
                          ) : (
                            'Choose Photo'
                          )}
                        </span>
                      </Button>
                    </label>
                    {uploadError && (
                      <p className="text-red-400 text-xs">{uploadError}</p>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <p className="text-sm text-zinc-300 font-medium mb-2">
                      By submitting, you confirm that:
                    </p>
                    <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                      <li>All information provided is accurate and complete</li>
                      <li>You agree to the company&apos;s HR policies</li>
                      <li>Your account is subject to admin approval before activation</li>
                    </ul>
                  </div>
                </>
              )}

              {/* ── Navigation ── */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                )}

                {step < 5 ? (
                  <Button type="button" onClick={goNext} className="flex-1">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || uploading}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      'Submit Registration'
                    )}
                  </Button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-zinc-400 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
