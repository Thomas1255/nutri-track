import { beforeEach, expect, it } from 'vitest'
import { repository } from './repository'
import { demoFoods } from './demo'
import { createLog, scaleNutrition } from '@/utils/nutrition'
import { localDate } from '@/utils/date'

beforeEach(() => localStorage.clear())
it('persists add, edit, date separation, and delete', async () => {
  const repo = repository(true, 'demo'),
    today = localDate()
  const log = createLog(
    demoFoods[0],
    '2026-01-01',
    'Dinner',
    1.5,
    { label: '40 g', multiplier: 1 },
    'demo',
  )
  await repo.saveLog(log)
  expect((await repo.load('2026-01-01')).logs).toHaveLength(1)
  expect((await repo.load(today)).logs.find((item) => item.id === log.id)).toBeUndefined()
  await repo.saveLog({ ...log, quantity: 2, ...scaleNutrition(log.per_serving, 2) })
  expect((await repository(true, 'demo').load('2026-01-01')).logs[0].calories).toBe(300)
  await repo.deleteLog(log.id)
  expect((await repo.load('2026-01-01')).logs).toHaveLength(0)
})
it('keeps logged nutrition after the custom definition changes or is deleted', async () => {
  const repo = repository(true, 'demo'),
    custom = { ...demoFoods[0], id: crypto.randomUUID(), source: 'custom' as const }
  await repo.saveFood(custom)
  const log = createLog(custom, '2026-01-01', 'Lunch', 1, { label: '40 g', multiplier: 1 }, 'demo')
  await repo.saveLog(log)
  await repo.saveFood({ ...custom, calories: 999 })
  await repo.deleteFood(custom.id)
  expect((await repo.load('2026-01-01')).logs[0].calories).toBe(150)
  expect((await repo.load('2026-01-01')).foods).toEqual([])
})
it('surfaces corrupted storage without silently destroying user changes', async () => {
  localStorage.setItem('nutritrack.demo.v1', '{corrupt')
  await expect(repository(true, 'demo').load(localDate())).rejects.toThrow(/could not be read/)
})
