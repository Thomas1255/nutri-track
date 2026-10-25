import { NavLink } from 'react-router-dom'
import { ArrowUpRight, CircleHelp, Leaf, LogOut, Sprout } from 'lucide-react'
import { SidebarNavigation } from './AppNavigation'

type AppSidebarProps = {
  name: string
  demo: boolean
  signingOut: boolean
  onSignOut: () => void
}

export function AppSidebar({ name, demo, signingOut, onSignOut }: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand">
        <span className="brand-mark">
          <Leaf />
        </span>
        nutritrack<span className="brand-dot">.</span>
      </NavLink>
      <p className="sidebar-label">YOUR DAILY SPACE</p>
      <SidebarNavigation />
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
        <a className="help-link" href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">
          <CircleHelp size={17} />
          About our food data
          <ArrowUpRight size={14} />
        </a>
        <button
          className="user-menu"
          onClick={onSignOut}
          disabled={signingOut}
          aria-label={demo ? 'Leave demo' : 'Sign out'}
        >
          <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{name}</strong>
            <small>{demo ? 'Local demo' : 'Personal account'}</small>
          </span>
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
