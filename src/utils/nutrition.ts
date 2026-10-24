import { emptyNutrition, type Food, type FoodLog, type Nutrition, type Profile } from '@/types'

export const nutrientKeys = ['calories', 'protein', 'carbs', 'fat'] as const
export const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export function validLogQuantity(quantity: number) {
  return (
    Number.isFinite(quantity) &&
    quantity >= 0.01 &&
    quantity <= 1000 &&
    Math.abs(quantity * 100 - Math.round(quantity * 100)) < 1e-7
  )
}
export function servingNutrition(nutrition: Nutrition, quantity: number): Nutrition {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000)
    throw new Error('Quantity must be greater than 0 and no more than 1,000.')
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      if (!Number.isFinite(nutrition[key]) || nutrition[key] < 0)
        throw new Error('Nutrition values must be nonnegative numbers.')
      return [key, nutrition[key] * quantity]
    }),
  ) as Nutrition
}
export function scaleNutrition(nutrition: Nutrition, quantity: number): Nutrition {
  const scaled = servingNutrition(nutrition, quantity)
  return Object.fromEntries(nutrientKeys.map((key) => [key, round(scaled[key])])) as Nutrition
}
export function completeNutrition(food: Pick<Food, keyof Nutrition>): food is Nutrition {
  return nutrientKeys.every(
    (key) => food[key] !== null && Number.isFinite(food[key]) && food[key]! >= 0,
  )
}
export function totals(logs: Nutrition[]): Nutrition {
  return logs.reduce(
    (sum, log) =>
      Object.fromEntries(nutrientKeys.map((key) => [key, round(sum[key] + log[key])])) as Nutrition,
    { ...emptyNutrition },
  )
}
export function createLog(
  food: Food,
  date: string,
  meal: FoodLog['meal'],
  quantity: number,
  serving: { label: string; multiplier: number },
  userId: string,
): FoodLog {
  if (!validLogQuantity(quantity))
    throw new Error('Use a quantity from 0.01 to 1,000, with at most two decimal places.')
  if (!completeNutrition(food))
    throw new Error('This food is missing nutrition data. Use a custom food with complete values.')
  const per_serving = servingNutrition(food, serving.multiplier)
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    log_date: date,
    meal,
    food_name: food.name,
    food_id: food.source === 'custom' ? food.id : null,
    fdc_id: food.fdc_id,
    quantity,
    serving_label: serving.label,
    per_serving,
    ...scaleNutrition(per_serving, quantity),
  }
}
export function estimateTargets(profile: Profile): Nutrition {
  const { age, height_cm, weight_kg, sex } = profile
  if (
    !age ||
    age < 18 ||
    age > 100 ||
    !height_cm ||
    height_cm < 100 ||
    height_cm > 250 ||
    !weight_kg ||
    weight_kg < 30 ||
    weight_kg > 350 ||
    !sex
  ) {
    throw new Error(
      'For an estimate, enter age 18–100, height 100–250 cm, weight 30–350 kg, and sex used for the formula.',
    )
  }
  const activity = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[profile.activity]
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + (sex === 'male' ? 5 : -161)
  const adjustment = { lose: -300, maintain: 0, gain: 300 }[profile.goal]
  const calories = Math.round((bmr * activity + adjustment) / 10) * 10
  return {
    calories,
    protein: Math.round((calories * 0.25) / 4),
    carbs: Math.round((calories * 0.45) / 4),
    fat: Math.round((calories * 0.3) / 9),
  }
}
export function validateTargets(value: Nutrition) {
  if (
    !Number.isFinite(value.calories) ||
    value.calories < 500 ||
    value.calories > 10000 ||
    nutrientKeys
      .slice(1)
      .some((key) => !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1000)
  ) {
    throw new Error('Enter calories between 500 and 10,000 and each macro between 0 and 1,000 g.')
  }
}
