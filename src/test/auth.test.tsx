import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthPage } from '@/features/auth/AuthPage'
import type { Session } from '@supabase/supabase-js'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth }, configError: null }))
beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})
function Login() {
  return (
    <MemoryRouter>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </MemoryRouter>
  )
}
it('submits credentials through Supabase and displays authentication errors', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
  const user = userEvent.setup()
  render(<Login />)
  await user.type(screen.getByLabelText('Email address'), 'portfolio@example.com')
  await user.type(screen.getByLabelText('Password'), 'a-test-password')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'portfolio@example.com',
    password: 'a-test-password',
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
})
it('registers using an email confirmation redirect', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  const user = userEvent.setup()
  render(<Login />)
  await user.click(screen.getByRole('button', { name: 'Create an account' }))
  await user.type(screen.getByLabelText('Email address'), 'portfolio@example.com')
  await user.type(screen.getByLabelText('Password'), 'a-test-password')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await waitFor(() =>
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'portfolio@example.com',
        options: { emailRedirectTo: `${window.location.origin}/login` },
      }),
    ),
  )
})
it('restores a saved Supabase session and signs out', async () => {
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'account-one', email: 'portfolio@example.com' } } },
    error: null,
  })
  auth.signOut.mockResolvedValue({ error: null })
  function Status() {
    const { loading, session, signOut } = useAuth()
    return (
      <div>
        {loading ? 'Loading' : (session?.user.email ?? 'Signed out')}
        <button onClick={() => void signOut()}>Log out</button>
      </div>
    )
  }
  const user = userEvent.setup()
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  )
  await screen.findByText('portfolio@example.com')
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  await screen.findByText('Signed out')
  expect(auth.signOut).toHaveBeenCalledOnce()
})

function SessionStatus() {
  const { session, loading, demo } = useAuth()
  return (
    <p>
      {loading
        ? 'Loading session'
        : session
          ? session.user.email
          : demo
            ? 'Demo session'
            : 'Signed out'}
    </p>
  )
}
it('does not overwrite a new sign-in with a stale session lookup', async () => {
  let resolveSession!: (value: { data: { session: null }; error: null }) => void
  auth.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve
    }),
  )
  render(
    <AuthProvider>
      <SessionStatus />
    </AuthProvider>,
  )
  const listener = auth.onAuthStateChange.mock.calls[0][0]
  await act(async () => {
    listener('SIGNED_IN', { user: { id: 'new-user', email: 'new@example.com' } } as Session)
  })
  expect(screen.getByText('new@example.com')).toBeInTheDocument()
  await act(async () => {
    resolveSession({ data: { session: null }, error: null })
  })
  expect(screen.getByText('new@example.com')).toBeInTheDocument()
})
it('returns to the authenticated account when restoring a session from demo mode', async () => {
  sessionStorage.setItem('nutritrack.demo', 'true')
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u', email: 'returning@example.com' } } },
    error: null,
  })
  render(
    <AuthProvider>
      <SessionStatus />
    </AuthProvider>,
  )
  await screen.findByText('returning@example.com')
  expect(sessionStorage.getItem('nutritrack.demo')).toBeNull()
})
