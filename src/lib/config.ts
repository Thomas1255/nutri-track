export function validateSupabaseConfig(url?: string, key?: string): string | null {
  if (Boolean(url) !== Boolean(key)) return 'Both Supabase environment variables must be set.'
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return 'VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
  }
  if (!key.startsWith('sb_publishable_'))
    return 'Use a Supabase publishable key (sb_publishable_…) in the browser. Secret and legacy service-role keys are not allowed.'
  return null
}
