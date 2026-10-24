import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthPage } from '@/features/auth/AuthPage'

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
