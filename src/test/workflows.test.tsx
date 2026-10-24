import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { localDate } from '@/utils/date'

// Chart sizing belongs to browser QA; this test exercises the real providers and forms.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}))
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
})
it('adds a fractional serving, edits it, reloads persistence, and removes it', async () => {
  const user = userEvent.setup(),
    app = render(<App />)
  await screen.findByRole('button', { name: 'Edit Rolled oats' })
  await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Add food' }))
  await user.type(screen.getByRole('textbox', { name: 'Search foods' }), 'banana')
  await user.click(await screen.findByRole('button', { name: /Banana/ }))
  await user.clear(screen.getByRole('spinbutton', { name: 'Quantity' }))
  await user.type(screen.getByRole('spinbutton', { name: 'Quantity' }), '1.5')
  await user.selectOptions(screen.getByLabelText('Add to meal'), 'Dinner')
  await user.click(screen.getByRole('button', { name: 'Add to dinner' }))
  await user.click(await screen.findByRole('button', { name: 'Edit Banana' }))
  await user.clear(screen.getByRole('spinbutton', { name: 'Quantity' }))
  await user.type(screen.getByRole('spinbutton', { name: 'Quantity' }), '2')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  app.unmount()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Edit Banana' }))
  expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(2)
  await user.click(screen.getByRole('button', { name: 'Remove from diary' }))
  await user.click(screen.getByRole('button', { name: 'Remove entry' }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Edit Banana' })).not.toBeInTheDocument(),
  )
})
it('creates, edits and deletes a custom food', async () => {
  const user = userEvent.setup()
  window.history.replaceState({}, '', '/foods')
  render(<App />)
  await screen.findByRole('heading', { name: 'A place for your favorites.' })
  await user.click(screen.getByRole('button', { name: 'Create food' }))
  await user.type(screen.getByLabelText('Food name'), 'Portfolio granola')
  for (const [label, value] of [
    ['Calories (kcal)', '200'],
    ['Protein (g)', '8'],
    ['Carbs (g)', '30'],
    ['Fat (g)', '5'],
  ])
    await user.type(screen.getByLabelText(label), value)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create food' }))
  await screen.findByRole('heading', { name: 'Portfolio granola' })
  await user.click(screen.getByRole('button', { name: 'Edit' }))
  await user.clear(screen.getByLabelText('Calories (kcal)'))
  await user.type(screen.getByLabelText('Calories (kcal)'), '250')
  await user.click(screen.getByRole('button', { name: 'Save food' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Delete Portfolio granola' }))
  await user.click(screen.getByRole('button', { name: 'Remove food' }))
  await screen.findByRole('heading', { name: 'A place for your favorites.' })
})
it('shows an empty historical date without carrying today’s meals across', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('button', { name: 'Edit Rolled oats' })
  const date = screen.getByLabelText('Choose diary date')
  // Native date fields are filled directly by the browser; fire a real change event here.
  const { fireEvent } = await import('@testing-library/react')
  fireEvent.change(date, { target: { value: '2020-01-01' } })
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Edit Rolled oats' })).not.toBeInTheDocument(),
  )
  expect(screen.getAllByText('No foods logged yet.')).toHaveLength(4)
  await user.click(screen.getByRole('button', { name: 'Today' }))
  await screen.findByRole('button', { name: 'Edit Rolled oats' })
  expect(screen.getByLabelText('Choose diary date')).toHaveValue(localDate())
})
it('saves independent manual targets and protects the signed-out route', async () => {
  const user = userEvent.setup()
  window.history.replaceState({}, '', '/profile')
  render(<App />)
  const calories = await screen.findByLabelText('Daily calories (kcal)')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save targets' })).toBeEnabled())
  await user.clear(screen.getByLabelText('First name'))
  await user.type(screen.getByLabelText('First name'), 'Unsaved name')
  await user.clear(calories)
  await user.type(calories, '2400')
  await user.click(screen.getByRole('button', { name: 'Save targets' }))
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('nutritrack.demo.v1')!).targets.calories).toBe(2400),
  )
  expect(screen.getByLabelText('First name')).toHaveValue('Unsaved name')
  await user.click(screen.getByRole('button', { name: 'Leave demo' }))
  await screen.findByRole('heading', { name: 'Welcome back.' })
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
})
