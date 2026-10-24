import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, LoaderCircle, Sprout, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { configError, supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { ErrorState } from '@/components/ui/error-state'

export function AuthPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [signup, setSignup] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (auth.session || auth.demo) return <Navigate to="/" replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim(),
      password = String(form.get('password'))
    setPending(true)
    setError(null)
    try {
      if (signup) {
        const redirect = import.meta.env.VITE_AUTH_REDIRECT_URL || `${window.location.origin}/login`
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        })
        if (error) throw error
        if (!data.session) toast.success('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a href="#" className="brand">
          <span className="brand-mark">
            <Leaf />
          </span>
          nutritrack<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="eyebrow">SMALL HABITS. REAL PROGRESS.</span>
          <h1>
            A little more
            <br />
            mindful, every day.
          </h1>
          <p>
            A space to understand your nutrition, enjoy your food, and build habits that feel like
            you.
          </p>
          <div className="auth-benefits">
            {[
              'Your nutrition, at a glance',
              'Simple, thoughtful food logging',
              'One account. Every device.',
            ].map((text) => (
              <div key={text}>
                <Check size={17} />
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-leaf">
          <Sprout size={180} strokeWidth={0.8} />
        </div>
        <small>Good things grow one day at a time.</small>
      </section>
      <section className="auth-form">
        <div className="w-full max-w-sm">
          <span className="eyebrow">YOUR EVERYDAY COMPANION</span>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            {signup ? 'Make room for a healthier you.' : 'Welcome back.'}
          </h2>
          <p className="mb-8 mt-3 text-sm text-muted-foreground">
            {signup ? 'Start your journey with NutriTrack.' : 'A fresh day. A little more balance.'}
          </p>
          {!supabase && (
            <div className="mb-5">
              <ErrorState
                message={
                  configError ||
                  'Account access needs Supabase setup. Add the two public values from .env.example and restart the app. You can explore the local demo below.'
                }
              />
            </div>
          )}
          {(error || auth.error) && (
            <div className="mb-5">
              <ErrorState message={error || auth.error!} />
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <Field label="Email address">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
                disabled={!supabase}
              />
            </Field>
            <Field label="Password" hint={signup ? 'Use at least 12 characters.' : undefined}>
              <Input
                name="password"
                type="password"
                autoComplete={signup ? 'new-password' : 'current-password'}
                minLength={signup ? 12 : 1}
                maxLength={128}
                required
                disabled={!supabase}
              />
            </Field>
            <Button className="w-full" type="submit" disabled={pending || !supabase}>
              {pending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <>
                  {signup ? 'Create account' : 'Sign in'}
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
          <p className="my-5 text-center text-sm text-muted-foreground">
            {signup ? 'Already have an account?' : 'New here?'}{' '}
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setSignup(!signup)
                setError(null)
              }}
            >
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            JUST LOOKING AROUND?
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              auth.enterDemo()
              navigate('/')
            }}
          >
            Explore the local demo
            <ArrowRight />
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Sample foods, saved only in this browser.
            <br />
            No account needed.
          </p>
        </div>
      </section>
    </main>
  )
}
