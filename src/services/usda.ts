import { supabase } from '@/lib/supabase'
import type { Food, NutrientValues } from '@/types'

type UsdaNutrient = {
  nutrientId?: number
  nutrient?: { id: number }
  value?: number
  amount?: number
  unitName?: string
}
export type UsdaFood = {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  foodNutrients?: UsdaNutrient[]
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodPortions?: {
    amount?: number
    gramWeight?: number
    modifier?: string
    portionDescription?: string
    measureUnit?: { name: string }
  }[]
}
export function normalizeUsda(food: UsdaFood): Food {
  const nutrients = food.foodNutrients ?? []
  const value = (ids: number[]): number | null => {
    for (const id of ids) {
      const item = nutrients.find((n) => (n.nutrientId ?? n.nutrient?.id) === id)
      const amount = item?.value ?? item?.amount
      if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) return amount
    }
    return null
  }
  const kj = value([1062])
  const nutrition: NutrientValues = {
    calories: value([1008, 2048, 2047]) ?? (kj === null ? null : kj / 4.184),
    protein: value([1003]),
    carbs: value([1005]),
    fat: value([1004]),
  }
  const portions = [
    { label: '100 g', multiplier: 1 },
    { label: '1 g', multiplier: 0.01 },
  ]
  if (food.servingSize && food.servingSizeUnit?.toLowerCase() === 'g')
    portions.push({
      label: food.householdServingFullText
        ? `${food.householdServingFullText} (${food.servingSize} g)`
        : `${food.servingSize} g serving`,
      multiplier: food.servingSize / 100,
    })
  for (const p of food.foodPortions ?? []) {
    if (!p.gramWeight || p.gramWeight <= 0) continue
    const unit = p.modifier || p.portionDescription || p.measureUnit?.name
    if (unit && unit !== 'undetermined')
      portions.push({
        label: `${p.amount ?? 1} ${unit} (${p.gramWeight} g)`,
        multiplier: p.gramWeight / 100,
      })
  }
  return {
    id: `usda-${food.fdcId}`,
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? null,
    fdc_id: food.fdcId,
    source: 'usda',
    serving_size: 100,
    serving_unit: 'g',
    grams_per_serving: 100,
    ...nutrition,
    portions,
  }
}
async function invoke(body: Record<string, unknown>, signal?: AbortSignal) {
  if (!supabase) throw new Error('Connect Supabase to search USDA foods.')
  const { data, error } = await supabase.functions.invoke('food-search', { body, signal })
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      const response = await error.context.json().catch(() => null)
      if (response?.error) throw new Error(response.error)
    }
    throw new Error(
      'Food search is unavailable. Check your connection and Edge Function setup, then try again.',
    )
  }
  if (data?.error) throw new Error(data.error)
  return data
}
export async function searchUsda(query: string, signal?: AbortSignal): Promise<Food[]> {
  const data = await invoke({ action: 'search', query }, signal)
  return (data.foods as UsdaFood[]).map(normalizeUsda)
}
export async function getUsdaFood(id: number, signal?: AbortSignal): Promise<Food> {
  return normalizeUsda(await invoke({ action: 'details', id }, signal))
}
