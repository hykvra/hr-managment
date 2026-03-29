import { NextRequest } from 'next/server'

/**
 * Build a public-facing URL from a Next.js API request.
 *
 * Railway (and other reverse proxies) set x-forwarded-host / x-forwarded-proto
 * to the real custom domain (e.g. hykvrasolutions.hrjo.in) while req.url itself
 * points to the internal service (http://localhost:8080/...).
 *
 * Always use this instead of `new URL(path, req.url)` when building redirect URLs.
 */
export function publicUrl(path: string, req: NextRequest): URL {
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  // Strip port from host — Railway forwards the clean custom domain here
  const cleanHost = host.split(',')[0].trim().split(':')[0]
  return new URL(path, `${proto}://${cleanHost}`)
}
