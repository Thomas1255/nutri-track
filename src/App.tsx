import { Component, lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import { AuthPage } from '@/features/auth/AuthPage'
import { Leaf } from 'lucide-react'

const DiaryApp = lazy(() =>
  import('@/features/food-logging/DiaryApp').then((module) => ({ default: module.DiaryApp })),
)
const DashboardPage = lazy(() =>
  import('@/features/nutrition/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const FoodsPage = lazy(() =>
  import('@/features/food-logging/FoodsPage').then((module) => ({ default: module.FoodsPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)

function AppLoading() {
  return (
    <div className="app-loading" role="status">
      <Leaf className="animate-pulse" />
      Getting your space ready…
    </div>
  )
}

function ProtectedApp() {
  const { session, demo, loading } = useAuth()
  if (loading) return <AppLoading />
  if (!session && !demo) return <Navigate to="/login" replace />
  return <DiaryApp accountId={demo ? 'demo' : session!.user.id} />
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
          <Suspense fallback={<AppLoading />}>
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
          </Suspense>
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
