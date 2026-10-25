export type FoodSearchDependencies = {
  allowedOrigins: string[]
  getApiKey: () => string | undefined
  createUserClient: (token: string) => {
    auth: {
      getUser: (token: string) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
    }
    rpc: (name: 'consume_food_search_quota') => PromiseLike<{ data: unknown; error: unknown }>
  }
  fetchUpstream: typeof fetch
}

export function createFoodSearchHandler(dependencies: FoodSearchDependencies) {
  const { allowedOrigins } = dependencies
  return async (request: Request) => {
    const origin = request.headers.get('Origin') || ''
    const cors: Record<string, string> = {
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    }
    if (allowedOrigins.includes(origin)) cors['Access-Control-Allow-Origin'] = origin
    const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
      Response.json(data, { status, headers: { ...cors, ...extra, 'Cache-Control': 'no-store' } })
    if (origin && !allowedOrigins.includes(origin))
      return json({ error: 'Origin is not allowed.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405)
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) return json({ error: 'Sign in to search foods.' }, 401)
    try {
      const client = dependencies.createUserClient(token)
      // Verify the caller, even if a deployment accidentally disables the gateway check.
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token)
      if (error || !user) return json({ error: 'Your session expired. Sign in again.' }, 401)
      if (!request.headers.get('Content-Type')?.includes('application/json'))
        return json({ error: 'Send JSON.' }, 415)
      // Read a bounded stream before parsing, rather than trusting Content-Length.
      const reader = request.body?.getReader()
      if (!reader) return json({ error: 'A request body is required.' }, 400)
      let body = '',
        bytes = 0
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 4096) {
          await reader.cancel()
          return json({ error: 'Request is too large.' }, 413)
        }
        body += decoder.decode(value, { stream: true })
      }
      body += decoder.decode()
      let input: { action?: string; query?: unknown; id?: unknown }
      try {
        input = JSON.parse(body)
      } catch {
        return json({ error: 'Invalid JSON.' }, 400)
      }
      if (!input || typeof input !== 'object') return json({ error: 'Invalid request.' }, 400)
      const query = typeof input.query === 'string' ? input.query.trim() : ''
      if (input.action !== 'search' && input.action !== 'details')
        return json({ error: 'Unsupported food action.' }, 400)
      if (input.action === 'search' && (query.length < 2 || query.length > 120))
        return json({ error: 'Search must be 2–120 characters.' }, 400)
      if (
        input.action === 'details' &&
        (typeof input.id !== 'number' || !Number.isSafeInteger(input.id) || input.id <= 0)
      )
        return json({ error: 'Invalid food ID.' }, 400)
      const apiKey = dependencies.getApiKey()
      if (!apiKey)
        return json(
          { error: 'Food search has not been configured yet. You can still create custom foods.' },
          503,
        )
      const { data: allowed, error: quotaError } = await client.rpc('consume_food_search_quota')
      if (quotaError)
        return json(
          { error: 'Food search configuration is incomplete. Apply the database migration.' },
          503,
        )
      if (allowed !== true)
        return json({ error: 'Too many searches. Please wait a minute.' }, 429, {
          'Retry-After': '60',
        })
      const url = new URL(
        input.action === 'search'
          ? 'https://api.nal.usda.gov/fdc/v1/foods/search'
          : `https://api.nal.usda.gov/fdc/v1/food/${input.id}`,
      )
      url.searchParams.set('api_key', apiKey)
      if (input.action === 'search') {
        url.searchParams.set('query', query)
        url.searchParams.set('pageSize', '20')
      }
      const upstream = await dependencies.fetchUpstream(url, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json' },
      })
      if (!upstream.ok)
        return json(
          {
            error:
              upstream.status === 429
                ? 'USDA search is busy. Please try again shortly.'
                : upstream.status === 404
                  ? 'This food is no longer available. Try another result.'
                  : 'USDA is unavailable right now. Try again later or create a custom food.',
          },
          upstream.status === 429 ? 429 : 502,
        )
      const data = await upstream.json()
      return json(input.action === 'search' ? { foods: data.foods ?? [] } : data)
    } catch {
      // Never echo fetch exceptions, which may contain the API-key-bearing upstream URL.
      return json({ error: 'Food search timed out or is unavailable. Please try again.' }, 502)
    }
  }
}
