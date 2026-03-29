'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <div>
          <p className="text-zinc-500 text-sm font-mono mb-2">500</p>
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-400 text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-zinc-600 text-xs font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
          >
            Try again
          </Button>
          <a href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              Go to dashboard
            </Button>
          </a>
        </div>

        <p className="text-zinc-700 text-xs">hrjo.in — HR Portal Platform</p>
      </div>
    </div>
  )
}
