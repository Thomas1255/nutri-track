import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { navigationLinks } from './navigation'

export function SidebarNavigation() {
  return (
    <nav aria-label="Main navigation">
      {navigationLinks.map(({ to, label, icon: Icon }) => (
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
  )
}

export function CompactNavigation({ onAddFood }: { onAddFood: () => void }) {
  return (
    <nav className="mobile-nav" aria-label="Compact navigation">
      {navigationLinks.map(({ to, compactLabel, icon: Icon }) => (
        <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={20} />
          <span>{compactLabel}</span>
        </NavLink>
      ))}
      <button className="mobile-add" aria-label="Add food" onClick={onAddFood}>
        <Plus />
      </button>
    </nav>
  )
}
