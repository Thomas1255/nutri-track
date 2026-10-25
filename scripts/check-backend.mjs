import { loadEnv } from 'vite'

// Only public project configuration is read. Never print credentials or raw responses.
const env = loadEnv('development', process.cwd(), 'VITE_')
const projectUrl = env.VITE_SUPABASE_URL?.trim()
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
if (!projectUrl || !publishableKey?.startsWith('sb_publishable_')) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local first.')
  process.exitCode = 1
} else {
  let project
  try {
    project = new URL(projectUrl)
    if (!['https:', 'http:'].includes(project.protocol)) throw new Error()
  } catch {
    console.error('VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.')
    process.exit(1)
  }
  const checks = [
    { name: 'Authentication', path: '/auth/v1/settings', method: 'GET' },
    ...['profiles', 'nutrition_targets', 'foods', 'food_logs'].map((table) => ({
      name: table,
      path: `/rest/v1/${table}?select=*&limit=0`,
      method: 'GET',
    })),
    { name: 'food-search', path: '/functions/v1/food-search', method: 'OPTIONS' },
  ]
  const results = await Promise.all(
    checks.map(async ({ name, path, method }) => {
      try {
        const response = await fetch(new URL(path, project), {
          method,
          headers: { apikey: publishableKey, Origin: 'http://127.0.0.1:5173' },
          signal: AbortSignal.timeout(15000),
        })
        const body = await response.json().catch(() => null)
        if (name === 'Authentication') {
          return {
            name,
            ready: response.ok && body?.external?.email === true,
            status: response.ok
              ? `reachable; email login ${body?.external?.email ? 'enabled' : 'disabled'}; email confirmation ${body?.mailer_autoconfirm === false ? 'required' : 'not required'}`
              : `HTTP ${response.status}`,
          }
        }
        if (name === 'food-search') {
          if (response.status === 404)
            return {
              name,
              ready: false,
              status: 'not deployed; deploy food-search with the Supabase CLI',
            }
          if (response.status === 403)
            return {
              name,
              ready: false,
              status: 'local origin rejected; check the function ALLOWED_ORIGINS secret',
            }
          return {
            name,
            ready: response.ok,
            status: response.ok
              ? 'preflight responding; signed-in USDA request still needs testing'
              : `HTTP ${response.status}`,
          }
        }
        if (body?.code === 'PGRST205' || body?.code === '42P01')
          return {
            name,
            ready: false,
            status: 'table missing from the API schema; apply the database migration',
          }
        if (body?.code === '42501')
          return { name, ready: true, status: 'exists; anonymous table access denied' }
        return {
          name,
          ready: response.ok,
          status: response.ok
            ? 'schema responding; user ownership policies still need authenticated verification'
            : `HTTP ${response.status}`,
        }
      } catch {
        return {
          name,
          ready: false,
          status: 'unreachable or timed out; check network access and project availability',
        }
      }
    }),
  )
  for (const result of results)
    console.log(`${result.ready ? 'OK' : 'SETUP NEEDED'}  ${result.name}: ${result.status}`)
  console.log(
    '\nThis read-only check does not create users, read diary rows, or verify signed-in workflows.',
  )
  if (results.some((result) => !result.ready)) process.exitCode = 1
}
