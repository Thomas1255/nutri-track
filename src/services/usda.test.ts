import { expect, it } from 'vitest'
import { normalizeUsda } from './usda'
it('normalizes search nutrient IDs and keeps legitimate zeros', () => {
  const food = normalizeUsda({
    fdcId: 1,
    description: 'Food',
    foodNutrients: [
      { nutrientId: 1008, value: 150 },
      { nutrientId: 1003, value: 0 },
      { nutrientId: 1005, value: 20 },
      { nutrientId: 1004, value: 5 },
    ],
  })
  expect(food.calories).toBe(150)
  expect(food.protein).toBe(0)
  expect(food.serving_size).toBe(100)
})
it('normalizes the nested food-details format and gram portions', () => {
  const food = normalizeUsda({
    fdcId: 2,
    description: 'Yogurt',
    foodNutrients: [{ nutrient: { id: 1008 }, amount: 70 }],
    foodPortions: [{ amount: 1, gramWeight: 170, modifier: 'container' }],
  })
  expect(food.calories).toBe(70)
  expect(food.portions).toContainEqual({ label: '1 container (170 g)', multiplier: 1.7 })
})
it('does not invent density for milliliter servings', () =>
  expect(
    normalizeUsda({ fdcId: 1, description: 'Drink', servingSize: 250, servingSizeUnit: 'ml' })
      .portions,
  ).toHaveLength(2))
it('converts energy in kJ only when kcal is unavailable', () =>
  expect(
    normalizeUsda({
      fdcId: 1,
      description: 'Food',
      foodNutrients: [{ nutrientId: 1062, value: 418.4 }],
    }).calories,
  ).toBeCloseTo(100))
it('supports Atwater energy and preserves unknown macros', () => {
  const food = normalizeUsda({
    fdcId: 1,
    description: 'Food',
    foodNutrients: [{ nutrientId: 2048, value: 99 }],
  })
  expect(food.calories).toBe(99)
  expect(food.fat).toBeNull()
})
it('ignores unusable and negative nutrient values', () =>
  expect(
    normalizeUsda({
      fdcId: 1,
      description: 'Food',
      foodNutrients: [{ nutrientId: 1003, value: -1 }],
    }).protein,
  ).toBeNull())
