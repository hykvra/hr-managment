'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Palette, Globe, Rocket, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const STEPS = [
  { id: 0, label: 'Welcome',  icon: Rocket },
  { id: 1, label: 'Branding', icon: Palette },
  { id: 2, label: 'Domain',   icon: Globe },
  { id: 3, label: 'Done',     icon: Check },
]

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'HR'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [brandName, setBrandName] = useState('')
  const [brandColor, setBrandColor] = useState('#6d28d9')
  const [brandInitials, setBrandInitials] = useState('')
  const [companyDomain, setCompanyDomain] = useState('')

  const initials = brandInitials || getInitials(brandName)

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName,
          brand_color: brandColor,
          brand_initials: brandInitials,
          company_domain: companyDomain,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error || 'Something went wrong')
        return
      }
      setStep(3)
    } finally {
      setSaving(false)
    }
  }

  function goToDashboard() {
    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = i === step
            const done = i < step
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center gap-1 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done ? 'bg-green-500' : active ? 'bg-violet-600' : 'bg-zinc-800'
                  }`}>
                    {done
                      ? <Check className="w-4 h-4 text-white" />
                      : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-500'}`} />
                    }
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-violet-400' : done ? 'text-green-400' : 'text-zinc-600'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-2 mb-4 transition-all ${done ? 'bg-green-500' : 'bg-zinc-800'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full max-w-lg">

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to hrjo.in</h1>
              <p className="text-zinc-400 mt-2">
                Let&apos;s set up your HR portal in just a few steps. It only takes 2 minutes.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-left">
              {[
                { icon: Palette, title: 'Brand it', desc: 'Add your company name & colors' },
                { icon: Globe,   title: 'Connect it', desc: 'Link your company domain' },
                { icon: Check,   title: 'Launch it', desc: 'Start managing your team' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-zinc-800 rounded-xl p-3 space-y-1">
                  <Icon className="w-4 h-4 text-violet-400" />
                  <p className="text-white text-xs font-semibold">{title}</p>
                  <p className="text-zinc-500 text-[10px]">{desc}</p>
                </div>
              ))}
            </div>
            <Button className="w-full bg-violet-600 hover:bg-violet-500" onClick={() => setStep(1)}>
              Get started <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── Step 1: Branding ── */}
        {step === 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Brand your portal</h2>
              <p className="text-zinc-400 text-sm mt-1">How should your employees see your company in the portal?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Company display name</Label>
                <Input
                  placeholder="e.g. Hykvra Technologies"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Brand color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <Input
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Logo initials <span className="text-zinc-500">(optional)</span></Label>
                  <Input
                    placeholder={getInitials(brandName) || 'HY'}
                    value={brandInitials}
                    onChange={e => setBrandInitials(e.target.value.toUpperCase().slice(0, 3))}
                    className="bg-zinc-800 border-zinc-700 text-white font-mono tracking-widest text-center"
                    maxLength={3}
                  />
                </div>
              </div>

              {/* Live preview */}
              <div className="border border-zinc-700 rounded-xl p-4 space-y-2">
                <p className="text-zinc-500 text-xs mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    <span className="text-white font-bold text-sm">{initials}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{brandName || 'Your Company Name'}</p>
                    <p className="text-zinc-500 text-xs">HR Portal</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-500" onClick={() => setStep(2)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Domain ── */}
        {step === 2 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Connect your domain</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Let employees find your portal by entering your company&apos;s website domain.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Company domain <span className="text-zinc-500">(optional)</span></Label>
              <Input
                placeholder="e.g. hykvra.com"
                value={companyDomain}
                onChange={e => setCompanyDomain(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                autoFocus
              />
              <p className="text-zinc-500 text-xs">
                Employees can go to <span className="text-violet-400">hrjo.in/find-workspace</span> and enter this domain to reach your portal.
              </p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-zinc-300 font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-400" /> Your portal URL
              </p>
              <p className="text-violet-400 font-mono text-sm break-all">
                {typeof window !== 'undefined'
                  ? `${window.location.protocol}//${window.location.hostname}/admin/dashboard`
                  : 'yourcompany.hrjo.in/admin/dashboard'}
              </p>
              <p className="text-zinc-500 text-xs">Share this with your team to access the HR portal</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-500"
                onClick={finish}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Finish setup <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">You&apos;re all set!</h2>
              <p className="text-zinc-400 mt-2">Your HR portal is ready to use.</p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 space-y-3 text-left">
              <p className="text-zinc-300 text-sm font-medium">What to do next</p>
              {[
                { icon: '👥', text: 'Add your employees from the Employees tab' },
                { icon: '🕐', text: 'Set up work shifts for attendance tracking' },
                { icon: '🌿', text: 'Configure leave policies for your team' },
                { icon: '💰', text: 'Set base salaries and payroll settings' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-zinc-400 text-sm">{text}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-violet-600 hover:bg-violet-500 text-base py-6"
              onClick={goToDashboard}
            >
              Go to dashboard <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
