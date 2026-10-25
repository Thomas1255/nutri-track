import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createFoodSearchHandler } from './handler.ts'

const allowedOrigins = (
  Deno.env.get('ALLOWED_ORIGINS') ||
  'http://localhost:5173,http://127.0.0.1:5173,https://localhost,capacitor://localhost'
)
  .split(',')
  .map((value) => value.trim())

Deno.serve(
  createFoodSearchHandler({
    allowedOrigins,
    getApiKey: () => Deno.env.get('USDA_API_KEY'),
    createUserClient: (token) =>
      createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: 'Bearer ' + token } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    fetchUpstream: fetch,
  }),
)
