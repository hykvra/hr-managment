export interface TenantBranding {
  name: string      // Display name, e.g. "Acme Corp"
  color: string     // Hex color for logo bubble, e.g. "#7c3aed"
  initials: string  // 1-2 letter fallback, e.g. "AC"
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'HR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Parse tenant branding from company_settings rows.
 * Pure function — no DB calls. Use alongside existing settings fetches.
 */
export function parseBranding(
  settings: { setting_key: string; setting_value: string }[],
  fallbackName = 'HR Portal',
): TenantBranding {
  const get = (key: string) => settings.find(s => s.setting_key === key)?.setting_value?.trim() || ''

  const name = get('brand_name') || fallbackName
  const color = get('brand_color') || '#2563eb'
  const initials = get('brand_initials') || getInitials(name)

  return { name, color, initials }
}
