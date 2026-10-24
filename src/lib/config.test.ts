import { expect, it } from 'vitest'
import { validateSupabaseConfig } from './config'
it('allows an unconfigured local demo and configured publishable key', () => {
  expect(validateSupabaseConfig()).toBeNull()
  expect(validateSupabaseConfig('https://example.supabase.co', 'sb_publishable_test')).toBeNull()
})
it('rejects partial and malformed configuration', () => {
  expect(validateSupabaseConfig('https://example.supabase.co')).toMatch(/Both/)
  expect(validateSupabaseConfig('not a url', 'sb_publishable_test')).toMatch(/URL/)
  expect(validateSupabaseConfig('javascript:alert(1)', 'sb_publishable_test')).toMatch(/URL/)
})
it('refuses secret and legacy JWT keys in browser configuration', () => {
  expect(validateSupabaseConfig('https://example.supabase.co', 'sb_secret_test')).toMatch(
    /publishable/,
  )
  expect(
    validateSupabaseConfig('https://example.supabase.co', 'eyJhbGciOiJIUzI1NiJ9.test'),
  ).toMatch(/publishable/)
})
