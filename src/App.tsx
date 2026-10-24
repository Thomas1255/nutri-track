import { Component, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthPage } from '@/features/auth/AuthPage'
import { DiaryProvider } from '@/features/food-logging/DiaryProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/nutrition/DashboardPage'
import { FoodsPage } from '@/features/food-logging/FoodsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { Leaf } from 'lucide-react'

function ProtectedApp() {
  const { session, demo, loading } = useAuth()
  if (loading)
    return (
      <div className="app-loading" role="status">
        <Leaf className="animate-pulse" />
        Getting your space ready…
      </div>
    )
  if (!session && !demo) return <Navigate to="/login" replace />
  return (
    <DiaryProvider key={demo ? 'demo' : session!.user.id}>
      <AppLayout />
    </DiaryProvider>
  )
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="app-loading">
        <h1>We couldn’t open your space.</h1>
        <p>Please reload the app. Your saved diary is still in storage.</p>
        <button className="text-primary underline" onClick={() => window.location.reload()}>
          Reload NutriTrack
        </button>
      </main>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route element={<ProtectedApp />}>
              <Route index element={<DashboardPage />} />
              <Route path="diary" element={<DashboardPage diaryOnly />} />
              <Route path="foods" element={<FoodsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
