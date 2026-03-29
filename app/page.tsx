import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Users,
  Clock,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Building2,
  Zap,
  Globe,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Full employee profiles, documents, hierarchy, and role-based access in one place.',
  },
  {
    icon: Clock,
    title: 'Attendance & Leaves',
    description: 'Daily attendance, automatic leave detection, approval workflows and penalty engine.',
  },
  {
    icon: BarChart3,
    title: 'Payroll & Advances',
    description: 'Pro-rated salary engine with bonuses, salary advances up to 50%, and CSV export.',
  },
  {
    icon: Shield,
    title: 'Multi-Role Access',
    description: 'Master admin, manager, attendance officer, and employee roles with fine-grained permissions.',
  },
  {
    icon: Globe,
    title: 'Your Own Subdomain',
    description: 'Every company gets a dedicated portal at yourcompany.hrjo.in — live in minutes.',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Sign up and start managing your team in under 5 minutes. No installation needed.',
  },
]

const highlights = [
  'Shift management and broadcast messaging',
  'Support ticket system with manager replies',
  'Printable payslips and employee reports',
  'Secure JWT authentication with httpOnly cookies',
  'Leave request management with approval workflows',
  'Company settings and per-tenant branding',
]

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    priceNote: '30-day trial',
    employees: 'Up to 25 employees',
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    priceNote: '/month',
    employees: 'Up to 100 employees',
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    priceNote: '/month',
    employees: 'Up to 500 employees',
    cta: 'Start free trial',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-white">hrjo.in</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                Get started free <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Building2 className="w-3.5 h-3.5" />
          HR software for growing companies
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
          HR management,<br />
          <span className="text-violet-400">your subdomain.</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Give your company a dedicated HR portal at{' '}
          <span className="text-white font-medium">yourcompany.hrjo.in</span>.
          Attendance, payroll, leaves, and team management — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 gap-2 h-12 px-8 text-base">
              Start free for 30 days <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base border-zinc-700 hover:bg-zinc-800">
              Sign in to your portal
            </Button>
          </Link>
        </div>
        <p className="text-zinc-600 text-sm mt-4">No credit card required · Setup in 5 minutes</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Everything your HR team needs</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            A complete HR platform purpose-built for small and mid-sized organisations.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Run your entire HR operation from one dashboard
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                From hiring to payroll, every workflow your HR team relies on is built in.
                No integrations, no plugins — just a complete system ready to go.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-zinc-400">Every plan starts with a 30-day free trial.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {plan.highlight && (
                <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded w-fit font-medium">
                  Most popular
                </span>
              )}
              <div>
                <p className="font-semibold text-white mb-1">{plan.name}</p>
                <p className="text-2xl font-bold text-white">
                  {plan.price}
                  <span className="text-sm font-normal text-zinc-500 ml-1">{plan.priceNote}</span>
                </p>
                <p className="text-sm text-zinc-400 mt-1">{plan.employees}</p>
              </div>
              <Link href="/signup" className="mt-auto">
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'border-zinc-700 hover:bg-zinc-800'
                  }`}
                  variant={plan.highlight ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-violet-900/40 to-violet-800/20 border border-violet-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to simplify your HR?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Create your company&apos;s HR portal in minutes. 30 days free, no credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 gap-2 h-12 px-10 text-base">
              Create your free portal <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="text-zinc-400 text-sm font-medium">hrjo.in</span>
          </div>
          <p className="text-zinc-600 text-sm">
            © {new Date().getFullYear()} hrjo.in · HR Portal Platform
          </p>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link href="/super-admin/login" className="hover:text-zinc-400 transition-colors">
              Admin
            </Link>
            <Link href="/login" className="hover:text-zinc-400 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
