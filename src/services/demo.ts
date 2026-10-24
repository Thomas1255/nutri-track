import { blankProfile, defaultTargets, type DiaryData, type Food } from '@/types'
import { createLog } from '@/utils/nutrition'
import { localDate } from '@/utils/date'

// Illustrative local fixtures, never represented as live USDA responses.
export const demoFoods: Food[] = [
  {
    id: 'demo-oats',
    name: 'Rolled oats',
    brand: 'Sample food',
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    serving_size: 40,
    serving_unit: 'g',
    grams_per_serving: 40,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-blueberries',
    name: 'Blueberries',
    brand: 'Sample food',
    calories: 84,
    protein: 1.1,
    carbs: 21.4,
    fat: 0.5,
    serving_size: 1,
    serving_unit: 'cup',
    grams_per_serving: 148,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-yogurt',
    name: 'Greek yogurt, plain',
    brand: 'Sample food',
    calories: 130,
    protein: 22,
    carbs: 8,
    fat: 0,
    serving_size: 170,
    serving_unit: 'g',
    grams_per_serving: 170,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-chicken',
    name: 'Grilled chicken breast',
    brand: 'Sample food',
    calories: 248,
    protein: 46.5,
    carbs: 0,
    fat: 5.4,
    serving_size: 150,
    serving_unit: 'g',
    grams_per_serving: 150,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-rice',
    name: 'Brown rice, cooked',
    brand: 'Sample food',
    calories: 216,
    protein: 5,
    carbs: 45,
    fat: 1.8,
    serving_size: 1,
    serving_unit: 'cup',
    grams_per_serving: 195,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-avocado',
    name: 'Avocado',
    brand: 'Sample food',
    calories: 160,
    protein: 2,
    carbs: 8.5,
    fat: 14.7,
    serving_size: 100,
    serving_unit: 'g',
    grams_per_serving: 100,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-almonds',
    name: 'Almonds',
    brand: 'Sample food',
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    serving_size: 28,
    serving_unit: 'g',
    grams_per_serving: 28,
    source: 'demo',
    fdc_id: null,
  },
  {
    id: 'demo-banana',
    name: 'Banana',
    brand: 'Sample food',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    serving_size: 1,
    serving_unit: 'medium',
    grams_per_serving: 118,
    source: 'demo',
    fdc_id: null,
  },
]
export type DemoStore = Omit<DiaryData, 'logs'> & { logs: DiaryData['logs'] }
const storageKey = 'nutritrack.demo.v1'
export function freshDemo(): DemoStore {
  const date = localDate()
  return {
    profile: { ...blankProfile('demo'), display_name: 'Alex' },
    targets: { ...defaultTargets, user_id: 'demo' },
    foods: [],
    logs: [0, 1, 2, 3, 4, 5].map((index) => {
      const food = demoFoods[index]
      return createLog(
        food,
        date,
        index < 3 ? 'Breakfast' : 'Lunch',
        index === 5 ? 0.5 : 1,
        { label: `${food.serving_size} ${food.serving_unit}`, multiplier: 1 },
        'demo',
      )
    }),
  }
}
export function readDemo(): DemoStore {
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    const value = freshDemo()
    writeDemo(value)
    return value
  }
  try {
    const data: DemoStore = JSON.parse(stored)
    if (!Array.isArray(data.logs) || !Array.isArray(data.foods) || !data.profile || !data.targets)
      throw new Error()
    return data
  } catch {
    throw new Error(
      'Local demo data could not be read. Clear NutriTrack demo data in browser storage and reload.',
    )
  }
}
export function writeDemo(data: DemoStore) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}
