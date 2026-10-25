import { Suspense, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { useDiary } from '@/features/food-logging/useDiary'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { FoodDialog } from '@/components/foods/FoodDialog'
import { errorMessage } from '@/lib/utils'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { CompactNavigation } from './AppNavigation'

export function AppLayout() {
  const auth = useAuth(),
    diary = useDiary(),
    navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const name = diary.profile.display_name || auth.session?.user.email?.split('@')[0] || 'You'

  async function signOut() {
    setSigningOut(true)
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <AppSidebar
        name={name}
        demo={auth.demo}
        signingOut={signingOut}
        onSignOut={() => void signOut()}
      />
      <div className="app-body">
        <AppHeader
          name={name}
          demo={auth.demo}
          loading={diary.loading}
          signingOut={signingOut}
          onRefresh={() => void diary.refresh()}
          onSignOut={() => void signOut()}
        />
        {auth.demo && (
          <div className="demo-banner">
            <span>
              <strong>A little look around.</strong> You’re exploring sample data saved in this
              browser.
            </span>
            <button onClick={() => void signOut()} disabled={signingOut}>
              Connect your account
              <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        <main id="main-content" className="main-content">
          {diary.error ? (
            <div className="space-y-4">
              <ErrorState message={diary.error} />
              <Button variant="outline" onClick={() => void diary.refresh()}>
                Try again
              </Button>
            </div>
          ) : (
            <Suspense fallback={<Skeleton className="h-64" aria-label="Loading page" />}>
              <Outlet />
            </Suspense>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Leaf size={13} />A little more mindful, every day.
          </span>
          <span>Made for your everyday.</span>
        </footer>
      </div>
      <CompactNavigation onAddFood={() => setAdding(true)} />
      {adding && <FoodDialog open onOpenChange={setAdding} />}
    </div>
  )
}
