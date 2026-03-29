import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8 text-zinc-400" />
        </div>

        <div>
          <p className="text-zinc-500 text-sm font-mono mb-2">404</p>
          <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
          <p className="text-zinc-400 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700">
              Go to dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              Sign in
            </Button>
          </Link>
        </div>

        <p className="text-zinc-700 text-xs">hrjo.in — HR Portal Platform</p>
      </div>
    </div>
  )
}
