import { useLocation } from 'react-router-dom'
import { Leaf, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigationLinks } from './navigation'

type AppHeaderProps = {
  name: string
  demo: boolean
  loading: boolean
  signingOut: boolean
  onRefresh: () => void
  onSignOut: () => void
}

export function AppHeader({
  name,
  demo,
  loading,
  signingOut,
  onRefresh,
  onSignOut,
}: AppHeaderProps) {
  const { pathname } = useLocation()
  const currentPage = navigationLinks.find((link) => link.to === pathname)?.label || 'Overview'

  return (
    <header className="topbar">
      <div className="mobile-brand">
        <Leaf size={22} />
        <strong>nutritrack.</strong>
      </div>
      <div className="desktop-breadcrumb">
        Your space<span>/</span>
        <span>{currentPage}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="connection-status">
          <i />
          {demo ? 'Local demo' : 'Connected'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh diary"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </Button>
        <span className="avatar top-avatar">{name.slice(0, 1).toUpperCase()}</span>
        <Button
          className="mobile-sign-out"
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          disabled={signingOut}
          aria-label={demo ? 'Leave local demo' : 'Sign out of account'}
          title={demo ? 'Leave demo' : 'Sign out'}
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  )
}
