import { supabaseAdmin } from '@/lib/supabase'

// In-memory slug → tenant_id cache (per cold start)
const slugCache = new Map<string, string>()

export async function resolveTenantId(slug: string): Promise<string | null> {
  if (!slug) return null
  if (slugCache.has(slug)) return slugCache.get(slug)!

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (!data?.id) return null
  slugCache.set(slug, data.id as string)
  return data.id as string
}

/** Extract tenant slug from hostname or fall back to env default */
export function tenantSlugFromHostname(hostname: string): string {
  const parts = hostname.split('.')
  // esam.hrjo.in  → parts.length=3 → 'esam'
  // www.hrjo.in   → parts.length=3 → 'www' (filtered below)
  // localhost     → parts.length=1 → default
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'esam'
}
