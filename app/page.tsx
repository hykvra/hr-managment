import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Manage employee profiles, documents, and organizational hierarchy with ease.',
  },
  {
    icon: Clock,
    title: 'Attendance Tracking',
    description: 'Daily attendance marking with automatic leave detection and penalty engine.',
  },
  {
    icon: BarChart3,
    title: 'Payroll Processing',
    description: '30-day pro-rate salary engine with bonuses, advances, and CSV export.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Master admin, manager, attendance, and employee roles with fine-grained permissions.',
  },
]

const highlights = [
  'Leave request management with approval workflows',
  'Salary advance requests up to 50% of base',
  'Support ticket system with manager replies',
  'Shift management and broadcast messaging',
  'Printable payslips and employee reports',
  'Secure JWT authentication with httpOnly cookies',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-semibold text-white">ESAM HR</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-6">
          HR Portal for Modern Teams
        </Badge>
        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          Everything your team needs,<br />
          <span className="text-blue-500">in one place.</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
          ESAM HR is a complete human resource management system — attendance,
          payroll, leaves, and more — built for growing organisations.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-white mb-8">
            Everything you need to run HR operations
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-zinc-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} ESAM HR Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
