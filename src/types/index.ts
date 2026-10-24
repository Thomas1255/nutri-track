export const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
export type Meal = (typeof meals)[number]
export type Nutrition = { calories: number; protein: number; carbs: number; fat: number }
export type NutrientValues = { [K in keyof Nutrition]: number | null }
export type Targets = Nutrition & { user_id: string }
export type Profile = {
  user_id: string
  display_name: string
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  sex: 'female' | 'male' | null
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
  target_weight_kg: number | null
}
export type Serving = { label: string; multiplier: number }
export type Food = NutrientValues & {
  id: string
  user_id?: string
  name: string
  brand: string | null
  source: 'custom' | 'usda' | 'demo'
  fdc_id: number | null
  serving_size: number
  serving_unit: string
  grams_per_serving: number | null
  portions?: Serving[]
}
export type FoodLog = Nutrition & {
  id: string
  user_id: string
  log_date: string
  meal: Meal
  food_name: string
  food_id: string | null
  fdc_id: number | null
  quantity: number
  serving_label: string
  per_serving: Nutrition
  created_at?: string
}
export type DiaryData = { profile: Profile; targets: Targets; foods: Food[]; logs: FoodLog[] }
export const defaultTargets: Nutrition = { calories: 2200, protein: 140, carbs: 260, fat: 67 }
export const emptyNutrition: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 }
export function blankProfile(user_id: string): Profile {
  return {
    user_id,
    display_name: '',
    age: null,
    height_cm: null,
    weight_kg: null,
    sex: null,
    activity: 'light',
    goal: 'maintain',
    target_weight_kg: null,
  }
}
