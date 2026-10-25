import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { validateSupabaseConfig } from './src/lib/config.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const error = validateSupabaseConfig(
    env.VITE_SUPABASE_URL?.trim(),
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  )
  if (error) throw new Error(error)
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: {
      environment: 'jsdom',
      // Local Supabase credentials must not switch fixture-based tests into account mode.
      env: {
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_PUBLISHABLE_KEY: '',
        VITE_AUTH_REDIRECT_URL: '',
      },
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      exclude: ['node_modules/**', 'supabase/**'],
    },
  }
})
