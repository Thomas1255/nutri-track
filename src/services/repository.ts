import { supabase } from '@/lib/supabase'
import {
  blankProfile,
  defaultTargets,
  type DiaryData,
  type Food,
  type FoodLog,
  type Profile,
  type Targets,
} from '@/types'
import { readDemo, writeDemo } from './demo'

export interface Repository {
  load(date: string): Promise<DiaryData>
  saveLog(log: FoodLog): Promise<void>
  deleteLog(id: string): Promise<void>
  saveFood(food: Food): Promise<void>
  deleteFood(id: string): Promise<void>
  saveProfile(profile: Profile): Promise<void>
  saveTargets(targets: Targets): Promise<void>
}
export function repository(demo: boolean, userId: string): Repository {
  if (demo)
    return {
      async load(date) {
        const data = readDemo()
        return { ...data, logs: data.logs.filter((log) => log.log_date === date) }
      },
      async saveLog(log) {
        const data = readDemo()
        data.logs = [...data.logs.filter((item) => item.id !== log.id), log]
        writeDemo(data)
      },
      async deleteLog(id) {
        const data = readDemo()
        data.logs = data.logs.filter((log) => log.id !== id)
        writeDemo(data)
      },
      async saveFood(food) {
        const data = readDemo()
        data.foods = [...data.foods.filter((item) => item.id !== food.id), food]
        writeDemo(data)
      },
      async deleteFood(id) {
        const data = readDemo()
        data.foods = data.foods.filter((food) => food.id !== id)
        data.logs = data.logs.map((log) => (log.food_id === id ? { ...log, food_id: null } : log))
        writeDemo(data)
      },
      async saveProfile(profile) {
        const data = readDemo()
        data.profile = profile
        writeDemo(data)
      },
      async saveTargets(targets) {
        const data = readDemo()
        data.targets = targets
        writeDemo(data)
      },
    }
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')
  return {
    async load(date) {
      const [profile, targets, foods, logs] = await Promise.all([
        client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        client.from('nutrition_targets').select('*').eq('user_id', userId).maybeSingle(),
        client.from('foods').select('*').eq('user_id', userId).order('name').limit(1000),
        client
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('log_date', date)
          .order('created_at')
          .limit(1000),
      ])
      for (const result of [profile, targets, foods, logs]) if (result.error) throw result.error
      return {
        profile: profile.data ?? blankProfile(userId),
        targets: targets.data ?? { ...defaultTargets, user_id: userId },
        foods: foods.data ?? [],
        logs: logs.data ?? [],
      }
    },
    async saveLog(log) {
      const { error } = await client.from('food_logs').upsert({ ...log, user_id: userId })
      if (error) throw error
    },
    async deleteLog(id) {
      const { error } = await client.from('food_logs').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    async saveFood(food) {
      const { portions: _portions, ...row } = food
      const { error } = await client
        .from('foods')
        .upsert({ ...row, user_id: userId, source: 'custom' })
      if (error) throw error
    },
    async deleteFood(id) {
      const { error } = await client.from('foods').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    async saveProfile(profile) {
      const { error } = await client.from('profiles').upsert({ ...profile, user_id: userId })
      if (error) throw error
    },
    async saveTargets(targets) {
      const { error } = await client
        .from('nutrition_targets')
        .upsert({ ...targets, user_id: userId })
      if (error) throw error
    },
  }
}
