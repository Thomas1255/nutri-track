import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  Leaf,
  LogOut,
  Plus,
  RefreshCw,
  Sprout,
  UserRound,
  Utensils,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { useDiary } from '@/features/food-logging/useDiary'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { errorMessage } from '@/lib/utils'
import { Suspense, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { FoodDialog } from '@/components/foods/FoodDialog'

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/diary', label: 'Food diary', icon: BookOpen },
  { to: '/foods', label: 'My foods', icon: Utensils },
  { to: '/profile', label: 'Profile & goals', icon: UserRound },
]
export function AppLayout() {
  const auth = useAuth(),
    diary = useDiary(),
    navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const name = diary.profile.display_name || auth.session?.user.email?.split('@')[0] || 'You'
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Leaf />
          </span>
          nutritrack<span className="brand-dot">.</span>
        </NavLink>
        <p className="sidebar-label">YOUR DAILY SPACE</p>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="grow-note">
            <Sprout size={27} strokeWidth={1.5} />
            <h3>Progress, at your pace.</h3>
            <p>
              Every mindful choice is
              <br />a step in the right direction.
            </p>
            <NavLink to="/profile">
              Make it personal
              <ArrowUpRight size={15} />
            </NavLink>
          </div>
          <a
            className="help-link"
            href="https://fdc.nal.usda.gov/"
            target="_blank"
            rel="noreferrer"
          >
            <CircleHelp size={17} />
            About our food data
            <ArrowUpRight size={14} />
          </a>
          <button
            className="user-menu"
            onClick={async () => {
              try {
                await auth.signOut()
                navigate('/login')
              } catch (e) {
                toast.error(errorMessage(e))
              }
            }}
            aria-label={auth.demo ? 'Leave demo' : 'Sign out'}
          >
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{name}</strong>
              <small>{auth.demo ? 'Local demo' : 'Personal account'}</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="mobile-brand">
            <Leaf size={22} />
            <strong>nutritrack.</strong>
          </div>
          <div className="desktop-breadcrumb">
            Your space<span>/</span>
            <span>Nutrition, made simple</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="connection-status">
              <i />
              {auth.demo ? 'Local demo' : 'Connected'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void diary.refresh()}
              disabled={diary.loading}
              aria-label="Refresh diary"
            >
              <RefreshCw size={17} className={diary.loading ? 'animate-spin' : ''} />
            </Button>
            <span className="avatar top-avatar">{name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        {auth.demo && (
          <div className="demo-banner">
            <span>
              <strong>A little look around.</strong> You’re exploring sample data saved in this
              browser.
            </span>
            <button
              onClick={async () => {
                await auth.signOut()
                navigate('/login')
              }}
            >
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
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} />
            <span>{label === 'Profile & goals' ? 'Profile' : label}</span>
          </NavLink>
        ))}
        <button className="mobile-add" aria-label="Add food" onClick={() => setAdding(true)}>
          <Plus />
        </button>
      </nav>
      {adding && <FoodDialog open onOpenChange={setAdding} />}
    </div>
  )
}
