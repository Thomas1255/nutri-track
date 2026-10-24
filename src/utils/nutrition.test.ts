import { describe, expect, it } from 'vitest'
import {
  completeNutrition,
  createLog,
  estimateTargets,
  scaleNutrition,
  totals,
  validateTargets,
} from './nutrition'
import { blankProfile, type Food } from '@/types'
const food: Food = {
  id: 'test',
  name: 'Test oats',
  brand: null,
  fdc_id: null,
  source: 'custom',
  serving_size: 40,
  serving_unit: 'g',
  grams_per_serving: 40,
  calories: 150,
  protein: 5,
  carbs: 27,
  fat: 3,
}
describe('serving math and historical snapshots', () => {
  it('scales fractional portions', () =>
    expect(scaleNutrition({ calories: 150, protein: 5, carbs: 27, fat: 3 }, 1.5)).toEqual({
      calories: 225,
      protein: 7.5,
      carbs: 40.5,
      fat: 4.5,
    }))
  it.each([0, -1, NaN, Infinity, 1001])('rejects invalid quantity %s', (quantity) =>
    expect(() => scaleNutrition({ calories: 1, protein: 1, carbs: 1, fat: 1 }, quantity)).toThrow(),
  )
  it('rejects invalid nutrient values', () =>
    expect(() => scaleNutrition({ calories: -1, protein: 1, carbs: 1, fat: 1 }, 1)).toThrow())
  it('rejects logging quantities below the database precision', () => {
    expect(() =>
      createLog(food, '2026-10-24', 'Lunch', 0.001, { label: '40 g', multiplier: 1 }, 'u'),
    ).toThrow(/two decimal/)
  })
  it('keeps missing data distinct from zero', () => {
    expect(completeNutrition({ ...food, protein: null })).toBe(false)
    expect(completeNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0 })).toBe(true)
  })
  it('refuses to log incomplete food', () =>
    expect(() =>
      createLog(
        { ...food, calories: null },
        '2026-10-24',
        'Lunch',
        1,
        { label: '40 g', multiplier: 1 },
        'user',
      ),
    ).toThrow(/missing/))
  it('converts gram servings without premature rounding', () => {
    const log = createLog(
      { ...food, calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
      '2026-10-24',
      'Lunch',
      100,
      { label: '1 g', multiplier: 1 / 118 },
      'user',
    )
    expect(log.calories).toBe(88.98)
    expect(log.protein).toBe(1.1)
    expect(log.carbs).toBe(22.88)
  })
  it('captures a snapshot unaffected by editing the food', () => {
    const mutable = { ...food },
      log = createLog(
        mutable,
        '2026-10-24',
        'Breakfast',
        2,
        { label: '40 g', multiplier: 1 },
        'user',
      )
    mutable.calories = 500
    expect(log.calories).toBe(300)
    expect(log.per_serving.calories).toBe(150)
    expect(scaleNutrition(log.per_serving, 0.5).calories).toBe(75)
  })
  it('sums all macros without floating point residue', () =>
    expect(
      totals([
        { calories: 0.1, protein: 0.1, carbs: 0.1, fat: 0.1 },
        { calories: 0.2, protein: 0.2, carbs: 0.2, fat: 0.2 },
      ]),
    ).toEqual({ calories: 0.3, protein: 0.3, carbs: 0.3, fat: 0.3 }))
  it('returns zeros for an empty day', () =>
    expect(totals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 }))
})
describe('personalized estimates', () => {
  const profile = {
    ...blankProfile('u'),
    age: 30,
    height_cm: 180,
    weight_kg: 80,
    sex: 'male' as const,
    activity: 'moderate' as const,
  }
  it('applies the male Mifflin–St Jeor formula and activity multiplier', () =>
    expect(estimateTargets(profile)).toEqual({ calories: 2760, protein: 173, carbs: 311, fat: 92 }))
  it('applies the female constant', () =>
    expect(estimateTargets({ ...profile, sex: 'female' }).calories).toBe(2500))
  it('applies the modest goal adjustment', () => {
    expect(estimateTargets({ ...profile, goal: 'lose' }).calories).toBe(2460)
    expect(estimateTargets({ ...profile, goal: 'gain' }).calories).toBe(3060)
  })
  it('requires a complete adult profile', () => {
    expect(() => estimateTargets({ ...profile, age: 17 })).toThrow()
    expect(() => estimateTargets({ ...profile, sex: null })).toThrow()
    expect(() => estimateTargets({ ...profile, weight_kg: NaN })).toThrow()
  })
  it('rejects invalid manual targets', () => {
    expect(() => validateTargets({ calories: 0, protein: 100, carbs: 200, fat: 50 })).toThrow()
    expect(() => validateTargets({ calories: 2000, protein: -1, carbs: 200, fat: 50 })).toThrow()
  })
})
