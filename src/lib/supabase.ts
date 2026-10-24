import { createClient } from '@supabase/supabase-js'
import type { Food, FoodLog, Profile, Targets } from '@/types'
import { validateSupabaseConfig } from './config'

type Table<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] }
type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      nutrition_targets: Table<Targets>
      foods: Table<Omit<Food, 'portions'>>
      food_logs: Table<FoodLog>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const configError = validateSupabaseConfig(url, key)
export const supabase =
  url && key && !configError
    ? createClient<Database>(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
