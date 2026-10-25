import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { readFile } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'

class SmokeFailure extends Error {}

function assert(condition, message) {
  if (!condition) throw new SmokeFailure(message)
}

function ok(result, label) {
  if (result.error)
    throw new SmokeFailure(
      `${label} failed (${result.error.status ?? result.error.code ?? 'request error'}).`,
    )
  return result.data
}

async function readAdminKey() {
  assert(
    !process.stdin.isTTY,
    'Pipe Supabase CLI API-key JSON through stdin to run this live check.',
  )
  let input = ''
  for await (const chunk of process.stdin) {
    input += chunk
    assert(input.length <= 65536, 'API-key input is too large.')
  }
  let keys
  try {
    keys = JSON.parse(input)
  } catch {
    throw new SmokeFailure('Expected Supabase CLI API-key JSON on stdin.')
  }
  const key = Array.isArray(keys)
    ? keys.find((item) => item?.name === 'service_role')?.api_key
    : undefined
  assert(typeof key === 'string' && key.length > 0, 'No test administration key was supplied.')
  return key
}

async function main() {
  const env = loadEnv('development', process.cwd(), 'VITE_')
  const projectUrl = env.VITE_SUPABASE_URL?.trim()
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  let linkedRef
  try {
    linkedRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()
  } catch {
    throw new SmokeFailure('Link the Supabase project before running this live check.')
  }
  let project
  try {
    project = new URL(projectUrl)
  } catch {
    throw new SmokeFailure('Set a valid VITE_SUPABASE_URL in .env.local first.')
  }
  assert(
    project.protocol === 'https:' && project.host === `${linkedRef}.supabase.co`,
    'The linked Supabase project must match VITE_SUPABASE_URL.',
  )
  assert(publicKey?.startsWith('sb_publishable_'), 'Set the public Supabase publishable key first.')
  // CLI key JSON is accepted only through stdin; credentials stay in process memory.
  const adminKey = await readAdminKey()
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }),
    },
  }
  const admin = createClient(project.href, adminKey, options)
  const client = createClient(project.href, publicKey, options)
  let userId
  async function invoke(body) {
    const result = await client.functions.invoke('food-search', {
      body,
      headers: { Origin: 'http://127.0.0.1:5173' },
    })
    if (result.error) {
      const status = result.error.context instanceof Response ? result.error.context.status : 0
      // Do not echo upstream messages, response bodies, request URLs, or credentials.
      throw new SmokeFailure(`Live food-search failed (HTTP ${status}).`)
    }
    return result.data
  }
  try {
    const email = `nutritrack-usda-${randomUUID()}@example.invalid`
    const password = randomBytes(30).toString('base64url')
    const created = ok(
      await admin.auth.admin.createUser({ email, password, email_confirm: true }),
      'Create disposable account',
    )
    userId = created.user.id
    ok(await client.auth.signInWithPassword({ email, password }), 'Password sign-in')
    console.log('PASS Disposable account signs in with the public application key')
    for (const query of ['oats', 'banana']) {
      const data = await invoke({ action: 'search', query })
      assert(Array.isArray(data?.foods) && data.foods.length > 0, `No live results for ${query}.`)
      console.log(`PASS Live USDA search for ${query}: ${data.foods.length} results`)
      const food =
        data.foods.find((item) => ['Foundation', 'SR Legacy'].includes(item.dataType)) ??
        data.foods[0]
      assert(
        Number.isSafeInteger(food.fdcId) && food.fdcId > 0,
        'Search returned an invalid food ID.',
      )
      const details = await invoke({ action: 'details', id: food.fdcId })
      assert(
        details?.fdcId === food.fdcId && Array.isArray(details.foodNutrients),
        'Details do not match the selected food.',
      )
      const hasNutrient = (ids) =>
        details.foodNutrients.some(
          (item) =>
            ids.includes(item.nutrient?.id ?? item.nutrientId) &&
            Number.isFinite(item.amount ?? item.value) &&
            (item.amount ?? item.value) >= 0,
        )
      assert(
        [1003, 1004, 1005].every((id) => hasNutrient([id])) &&
          hasNutrient([1008, 2047, 2048, 1062]),
        'Selected live food is missing energy or a macro value.',
      )
      console.log(
        `PASS Live food details: FDC ${details.fdcId}; energy and all three macros present`,
      )
    }
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) {
        console.error(`CLEANUP FAILED: Remove disposable user ${userId} in Supabase Auth.`)
        process.exitCode = 1
      } else {
        console.log('CLEANUP Disposable account and associated rows removed')
      }
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof SmokeFailure ? error.message : 'Live USDA smoke check failed.')
  process.exitCode = 1
}
