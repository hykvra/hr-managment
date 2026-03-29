'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FindWorkspacePage() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [found, setFound] = useState<{ slug: string; company_name: string } | null>(null)

  async function handleFind(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFound(null)
    if (!domain.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/public/find-tenant?domain=${encodeURIComponent(domain.trim())}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'No workspace found for that domain.')
        return
      }
      setFound(json)
    } finally {
      setLoading(false)
    }
  }

  function goToWorkspace() {
    if (!found) return
    const host = window.location.host.replace(/^[^.]+\./, '') // strip any subdomain
    window.location.href = `${window.location.protocol}//${found.slug}.${host}/login`
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">H</span>
          </div>
          <h1 className="text-xl font-bold text-white">hrjo.in</h1>
          <p className="text-zinc-500 text-xs mt-1">Find your company workspace</p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-400" />
              Find your workspace
            </CardTitle>
            <CardDescription>
              Enter your company&apos;s domain name to locate your HR portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!found ? (
              <>
                <form onSubmit={handleFind} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="domain">Company domain</Label>
                    <Input
                      id="domain"
                      type="text"
                      placeholder="e.g. hykvra.com or esam.in"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                      autoFocus
                    />
                    <p className="text-zinc-500 text-xs">
                      Enter the domain your company uses, not the hrjo.in address
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-md p-3">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || !domain.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Find workspace
                  </Button>
                </form>

                <p className="text-center text-sm text-zinc-500 mt-6">
                  Know your workspace?{' '}
                  <span className="text-zinc-400">
                    Go to <span className="text-violet-400">yourcompany.hrjo.in</span>
                  </span>
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <p className="text-green-400 text-sm font-medium mb-1">Workspace found!</p>
                  <p className="text-white text-lg font-bold">{found.company_name}</p>
                  <p className="text-zinc-400 text-sm mt-1">
                    {found.slug}.hrjo.in
                  </p>
                </div>

                <Button className="w-full" onClick={goToWorkspace}>
                  Go to {found.company_name} portal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <button
                  type="button"
                  onClick={() => { setFound(null); setDomain('') }}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-400"
                >
                  Search again
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-zinc-600 text-xs mt-6">
          New to hrjo.in?{' '}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
