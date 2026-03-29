import Link from 'next/link'
import { Clock, ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    priceNote: '+ subscription',
    employees: '25 employees',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    priceNote: '/month',
    employees: '100 employees',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    priceNote: '/month',
    employees: '500 employees',
    highlight: false,
  },
]

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Your free trial has ended</h1>
          <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Your 30-day trial has expired. Choose a plan to continue using your HR portal —
            all your data is safe and waiting.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-xl border p-4 text-left ${
                plan.highlight
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {plan.highlight && (
                <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-medium block w-fit mb-2">
                  Popular
                </span>
              )}
              <p className="font-semibold text-white text-sm">{plan.name}</p>
              <p className="text-lg font-bold text-white mt-1">
                {plan.price}
                <span className="text-xs font-normal text-zinc-500 ml-0.5">{plan.priceNote}</span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">{plan.employees}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a href="mailto:support@hrjo.in?subject=Plan%20Upgrade%20Request">
            <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
              <ArrowRight className="w-4 h-4" />
              Upgrade my plan
            </Button>
          </a>
          <a href="mailto:support@hrjo.in">
            <Button variant="outline" className="w-full gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              <Mail className="w-4 h-4" />
              Contact support@hrjo.in
            </Button>
          </a>
          <Link href="/login">
            <Button variant="ghost" className="w-full text-zinc-500 hover:text-zinc-300">
              Back to login
            </Button>
          </Link>
        </div>

        <p className="text-zinc-700 text-xs">
          Your data is retained for 60 days after trial expiry.
        </p>
      </div>
    </div>
  )
}
