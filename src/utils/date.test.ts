import { expect, it } from 'vitest'
import { localDate, offsetDate, parseDate } from './date'
it('uses local calendar components rather than UTC slicing', () =>
  expect(localDate(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24'))
it('crosses month and year boundaries', () => {
  expect(offsetDate('2026-12-31', 1)).toBe('2027-01-01')
  expect(offsetDate('2026-03-01', -1)).toBe('2026-02-28')
})
it('keeps dates anchored at noon across daylight saving changes', () => {
  expect(offsetDate('2026-03-08', 1)).toBe('2026-03-09')
  expect(parseDate('2026-10-24').getHours()).toBe(12)
})
