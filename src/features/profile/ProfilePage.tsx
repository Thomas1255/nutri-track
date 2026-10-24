import { useEffect, useState, type FormEvent } from 'react'
import { Calculator, Check, Info, LoaderCircle, Target, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useDiary } from '@/features/food-logging/useDiary'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, selectClass } from '@/components/ui/field'
import { ErrorState } from '@/components/ui/error-state'
import { estimateTargets, validateTargets } from '@/utils/nutrition'
import { errorMessage } from '@/lib/utils'
import type { Profile, Nutrition } from '@/types'

export function ProfilePage() {
  const diary = useDiary()
  const [profile, setProfile] = useState(diary.profile),
    [targets, setTargets] = useState<Nutrition>(diary.targets)
  const [saving, setSaving] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [estimated, setEstimated] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [targetsDirty, setTargetsDirty] = useState(false)
  useEffect(() => {
    if (!profileDirty) setProfile(diary.profile)
    if (!targetsDirty) setTargets(diary.targets)
  }, [diary.profile, diary.targets, profileDirty, targetsDirty])
  function setNumber(key: 'age' | 'height_cm' | 'weight_kg' | 'target_weight_kg', value: string) {
    setProfile((p) => ({ ...p, [key]: value === '' ? null : Number(value) }))
  }
  async function save(event: FormEvent, kind: 'profile' | 'targets') {
    event.preventDefault()
    setError(null)
    setSaving(kind)
    try {
      if (kind === 'targets') {
        validateTargets(targets)
        await diary.saveTargets({ ...targets, user_id: diary.userId })
        setEstimated(false)
        setTargetsDirty(false)
      } else {
        await diary.saveProfile({ ...profile, display_name: profile.display_name.trim() })
        setProfileDirty(false)
      }
      toast.success(kind === 'profile' ? 'Profile saved' : 'Daily targets saved')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(null)
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A PLAN THAT FEELS LIKE YOU</p>
          <h1>
            Your goals, your way<span className="heading-dot">.</span>
          </h1>
          <p>A few details to make your daily nutrition a little more personal.</p>
        </div>
      </div>
      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}
      <div className="profile-grid">
        <Card className="profile-card">
          <div className="profile-card-title">
            <span className="profile-title-icon">
              <UserRound size={20} />
            </span>
            <div>
              <h2>A little about you</h2>
              <p>Your information stays in your account.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => void save(e, 'profile')}
            onChange={() => setProfileDirty(true)}
            className="space-y-5"
          >
            <Field label="First name">
              <Input
                value={profile.display_name}
                maxLength={80}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="What should we call you?"
                autoComplete="given-name"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Age (years)">
                <Input
                  type="number"
                  min="18"
                  max="100"
                  step="1"
                  value={profile.age ?? ''}
                  onChange={(e) => setNumber('age', e.target.value)}
                />
              </Field>
              <Field label="Sex used for estimation" hint="Used only for the calorie formula.">
                <select
                  className={selectClass}
                  value={profile.sex ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      sex: e.target.value ? (e.target.value as Profile['sex']) : null,
                    })
                  }
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </Field>
              <Field label="Height (cm)">
                <Input
                  type="number"
                  min="100"
                  max="250"
                  step="0.1"
                  value={profile.height_cm ?? ''}
                  onChange={(e) => setNumber('height_cm', e.target.value)}
                />
              </Field>
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  min="30"
                  max="350"
                  step="0.1"
                  value={profile.weight_kg ?? ''}
                  onChange={(e) => setNumber('weight_kg', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Activity level">
              <select
                className={selectClass}
                value={profile.activity}
                onChange={(e) =>
                  setProfile({ ...profile, activity: e.target.value as Profile['activity'] })
                }
              >
                <option value="sedentary">Sedentary · mostly sitting</option>
                <option value="light">Light · exercise 1–3 days/week</option>
                <option value="moderate">Moderate · exercise 3–5 days/week</option>
                <option value="active">Active · exercise 6–7 days/week</option>
                <option value="very_active">Very active · physical work + exercise</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Your goal">
                <select
                  className={selectClass}
                  value={profile.goal}
                  onChange={(e) =>
                    setProfile({ ...profile, goal: e.target.value as Profile['goal'] })
                  }
                >
                  <option value="lose">Lose weight</option>
                  <option value="maintain">Maintain weight</option>
                  <option value="gain">Gain weight</option>
                </select>
              </Field>
              <Field label="Target weight (kg)" hint="Optional">
                <Input
                  type="number"
                  min="30"
                  max="350"
                  step="0.1"
                  value={profile.target_weight_kg ?? ''}
                  onChange={(e) => setNumber('target_weight_kg', e.target.value)}
                />
              </Field>
            </div>
            <Button type="submit" disabled={saving !== null || diary.loading}>
              {saving === 'profile' ? <LoaderCircle className="animate-spin" /> : <Check />}Save
              profile
            </Button>
          </form>
        </Card>
        <div className="space-y-5">
          <Card className="profile-card">
            <div className="profile-card-title">
              <span className="profile-title-icon">
                <Target size={20} />
              </span>
              <div>
                <h2>Your daily targets</h2>
                <p>Start with an estimate, or set your own.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mb-5 w-full"
              onClick={() => {
                try {
                  setTargets(estimateTargets(profile))
                  setTargetsDirty(true)
                  setEstimated(true)
                  setError(null)
                } catch (e) {
                  setError(errorMessage(e))
                }
              }}
            >
              <Calculator />
              Calculate from my profile
            </Button>
            {estimated && (
              <p className="mb-5 text-sm text-primary" role="status">
                Estimate ready. Review it below, then save your targets.
              </p>
            )}
            <form
              onSubmit={(e) => void save(e, 'targets')}
              onChange={() => setTargetsDirty(true)}
              className="space-y-5"
            >
              <Field label="Daily calories (kcal)">
                <Input
                  type="number"
                  min="500"
                  max="10000"
                  step="1"
                  value={targets.calories}
                  required
                  onChange={(e) => setTargets({ ...targets, calories: Number(e.target.value) })}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                {(['protein', 'carbs', 'fat'] as const).map((key) => (
                  <Field label={`${key.charAt(0).toUpperCase() + key.slice(1)} (g)`} key={key}>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      required
                      value={targets[key]}
                      onChange={(e) => setTargets({ ...targets, [key]: Number(e.target.value) })}
                    />
                  </Field>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Macro targets represent approximately{' '}
                {Math.round(
                  targets.protein * 4 + targets.carbs * 4 + targets.fat * 9,
                ).toLocaleString()}{' '}
                kcal. You can adjust them independently.
              </p>
              <Button type="submit" disabled={saving !== null || diary.loading}>
                {saving === 'targets' ? <LoaderCircle className="animate-spin" /> : <Check />}Save
                targets
              </Button>
            </form>
          </Card>
          <div className="estimate-note">
            <Info size={19} />
            <div>
              <h3>A starting point, not a prescription.</h3>
              <p>
                Estimates use the Mifflin–St Jeor equation and your activity level, with a 300 kcal
                adjustment for your goal. Macros use a 25% protein, 45% carbohydrate, 30% fat split.
                These adult estimates and default targets are not medical advice. Your needs may
                differ; a qualified professional can help tailor them.
              </p>
              <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">
                Read about the equation ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
