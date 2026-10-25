import { BookOpen, LayoutDashboard, UserRound, Utensils } from 'lucide-react'

export const navigationLinks = [
  { to: '/', label: 'Overview', compactLabel: 'Overview', icon: LayoutDashboard },
  { to: '/diary', label: 'Food diary', compactLabel: 'Food diary', icon: BookOpen },
  { to: '/foods', label: 'My foods', compactLabel: 'My foods', icon: Utensils },
  { to: '/profile', label: 'Profile & goals', compactLabel: 'Profile', icon: UserRound },
] as const
