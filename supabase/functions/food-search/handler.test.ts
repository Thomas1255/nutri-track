import { createFoodSearchHandler, type FoodSearchDependencies } from './handler.ts'

function assert(value: unknown, message = 'Assertion failed'): asserts value {
  if (!value) throw new Error(message)
}
const origin = 'http://127.0.0.1:5173'
function request(
  body: unknown = { action: 'search', query: 'oats' },
  options: {
    token?: string
    method?: string
    origin?: string
    raw?: string
    contentType?: string
  } = {},
) {
  const method = options.method ?? 'POST'
  return new Request('http://localhost/food-search', {
    method,
    headers: {
      Origin: options.origin ?? origin,
      ...(options.token === ''
        ? {}
        : { Authorization: `Bearer ${options.token ?? 'test-user-token'}` }),
      'Content-Type': options.contentType ?? 'application/json',
    },
    ...(['GET', 'OPTIONS'].includes(method) ? {} : { body: options.raw ?? JSON.stringify(body) }),
  })
}
function fixture(overrides: Partial<FoodSearchDependencies> = {}) {
  let verifiedToken = '',
    quotaCalls = 0,
    upstreamCalls = 0
  const dependencies: FoodSearchDependencies = {
    allowedOrigins: [origin],
    getApiKey: () => 'fixture-usda-key',
    createUserClient: () => ({
      auth: {
        async getUser(token) {
          verifiedToken = token
          return { data: { user: { id: 'test-user' } }, error: null }
        },
      },
      async rpc() {
        quotaCalls++
        return { data: true, error: null }
      },
    }),
    fetchUpstream: async () => {
      upstreamCalls++
      return Response.json({ foods: [{ fdcId: 123, description: 'Test-only food fixture' }] })
    },
    ...overrides,
  }
  return {
    handle: createFoodSearchHandler(dependencies),
    state: () => ({ verifiedToken, quotaCalls, upstreamCalls }),
  }
}

Deno.test('allows CORS preflight without requiring a session or calling USDA', async () => {
  const { handle, state } = fixture()
  const response = await handle(request(undefined, { method: 'OPTIONS', token: '' }))
  assert(response.status === 204)
  assert(response.headers.get('Access-Control-Allow-Origin') === origin)
  assert(state().upstreamCalls === 0)
})
Deno.test('rejects an unlisted website origin', async () => {
  const { handle, state } = fixture()
  const response = await handle(request(undefined, { origin: 'https://untrusted.example' }))
  assert(response.status === 403 && !response.headers.has('Access-Control-Allow-Origin'))
  assert(state().verifiedToken === '')
})
Deno.test('rejects unsupported methods and absent bearer tokens', async () => {
  const { handle, state } = fixture()
  assert((await handle(request(undefined, { method: 'GET' }))).status === 405)
  assert((await handle(request(undefined, { token: '' }))).status === 401)
  assert(state().upstreamCalls === 0)
})
Deno.test('checks the user token before allowing any upstream request', async () => {
  const { handle, state } = fixture({
    createUserClient: () => ({
      auth: {
        async getUser() {
          return { data: { user: null }, error: { message: 'expired' } }
        },
      },
      async rpc() {
        throw new Error('Quota must not be called')
      },
    }),
  })
  assert((await handle(request())).status === 401)
  assert(state().upstreamCalls === 0)
})
Deno.test('rejects invalid request data before consuming quota', async () => {
  const { handle, state } = fixture()
  for (const body of [
    null,
    [],
    { action: 'unknown' },
    { action: 'search', query: 'a' },
    { action: 'search', query: 'a'.repeat(121) },
    { action: 'details', id: -1 },
    { action: 'details', id: 1.5 },
    { action: 'details', id: '123' },
  ]) {
    assert((await handle(request(body))).status === 400)
  }
  assert((await handle(request(undefined, { raw: '{invalid' }))).status === 400)
  assert((await handle(request(undefined, { contentType: 'text/plain' }))).status === 415)
  assert(state().quotaCalls === 0 && state().upstreamCalls === 0)
})
Deno.test('bounds body size without relying on Content-Length', async () => {
  const { handle, state } = fixture()
  assert((await handle(request(undefined, { raw: 'x'.repeat(4097) }))).status === 413)
  assert(state().quotaCalls === 0)
})
Deno.test('reports missing USDA setup instead of using a public demo key', async () => {
  const { handle, state } = fixture({ getApiKey: () => undefined })
  assert((await handle(request())).status === 503)
  assert(state().quotaCalls === 0 && state().upstreamCalls === 0)
})
Deno.test('fails closed on missing quota configuration or unexpected quota response', async () => {
  for (const quota of [
    { data: null, error: { message: 'migration missing' } },
    { data: false, error: null },
    { data: 'true', error: null },
  ]) {
    const { handle, state } = fixture({
      createUserClient: () => ({
        auth: {
          async getUser() {
            return { data: { user: { id: 'test-user' } }, error: null }
          },
        },
        async rpc() {
          return quota
        },
      }),
    })
    const response = await handle(request())
    assert(response.status === (quota.error ? 503 : 429))
    if (!quota.error) assert(response.headers.get('Retry-After') === '60')
    assert(state().upstreamCalls === 0)
  }
})
Deno.test(
  'encodes search queries, verifies auth, and returns only the search envelope',
  async () => {
    let upstreamUrl = ''
    const { handle, state } = fixture({
      fetchUpstream: async (input) => {
        upstreamUrl = String(input)
        return Response.json({ foods: [{ fdcId: 123 }], unused: 'metadata' })
      },
    })
    const response = await handle(request({ action: 'search', query: ' oats & milk ' }))
    assert(response.status === 200 && state().verifiedToken === 'test-user-token')
    assert(state().quotaCalls === 1)
    const url = new URL(upstreamUrl)
    assert(url.origin === 'https://api.nal.usda.gov')
    assert(
      url.searchParams.get('query') === 'oats & milk' && url.searchParams.get('pageSize') === '20',
    )
    const body = await response.text()
    assert(body.includes('foods') && !body.includes('unused') && !body.includes('fixture-usda-key'))
    assert(response.headers.get('Cache-Control') === 'no-store')
  },
)
Deno.test('uses the numeric details endpoint and returns food details', async () => {
  let endpoint = ''
  const { handle } = fixture({
    fetchUpstream: async (input) => {
      endpoint = new URL(String(input)).pathname
      return Response.json({ fdcId: 123, description: 'Test-only details fixture' })
    },
  })
  const response = await handle(request({ action: 'details', id: 123 }))
  assert(response.status === 200 && endpoint === '/fdc/v1/food/123')
  assert((await response.json()).fdcId === 123)
})
Deno.test('maps upstream errors without exposing the USDA key', async () => {
  for (const status of [401, 404, 429, 500]) {
    const { handle } = fixture({
      fetchUpstream: async () =>
        new Response('private upstream error fixture-usda-key', { status }),
    })
    const response = await handle(request())
    assert(response.status === (status === 429 ? 429 : 502))
    assert(!(await response.text()).includes('fixture-usda-key'))
  }
})
Deno.test('does not leak API-key-bearing URLs when upstream fetch throws', async () => {
  const { handle } = fixture({
    fetchUpstream: async () => {
      throw new Error('Fetch failed https://example.test?api_key=fixture-usda-key')
    },
  })
  const response = await handle(request())
  assert(response.status === 502 && !(await response.text()).includes('fixture-usda-key'))
})
