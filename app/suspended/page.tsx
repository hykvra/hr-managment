import Link from 'next/link'
import { Ban, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 text-red-400" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Workspace suspended</h1>
          <p className="text-zinc-400 leading-relaxed">
            Access to this HR portal has been suspended. This may be due to a billing
            issue or a policy violation.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3">
          <p className="text-sm font-medium text-zinc-300">What to do next</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-zinc-600 mt-0.5">1.</span>
              Contact your workspace administrator.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-zinc-600 mt-0.5">2.</span>
              If you are the admin, reach out to hrjo.in support to resolve the issue.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-zinc-600 mt-0.5">3.</span>
              Once the issue is resolved, access will be reinstated automatically.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a href="mailto:support@hrjo.in">
            <Button className="w-full gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" variant="outline">
              <Mail className="w-4 h-4" />
              Contact support@hrjo.in
            </Button>
          </a>
          <Link href="/login">
            <Button variant="ghost" className="w-full text-zinc-400 hover:text-zinc-200">
              Back to login
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-700 text-xs">
          hrjo.in — HR Portal Platform
        </p>
      </div>
    </div>
  )
}
