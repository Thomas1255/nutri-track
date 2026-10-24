import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'
import { AuthContext } from './useAuth'
// Keep the context in a separate module so Fast Refresh preserves its identity.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(null)
  const [demo, setDemo] = useState(
    () => !supabase || sessionStorage.getItem('nutritrack.demo') === 'true',
  )
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (!active) return
        if (authError) setError(authError.message)
        setSession(data.session)
        setLoading(false)
      })
      .catch((error) => {
        if (active) {
          setError(errorMessage(error))
          setLoading(false)
        }
      })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next)
        setLoading(false)
        if (next) {
          setDemo(false)
          sessionStorage.removeItem('nutritrack.demo')
        }
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        demo,
        error,
        enterDemo() {
          sessionStorage.setItem('nutritrack.demo', 'true')
          setDemo(true)
        },
        async signOut() {
          if (session && supabase) {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
          }
          sessionStorage.removeItem('nutritrack.demo')
          setDemo(false)
          setSession(null)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
