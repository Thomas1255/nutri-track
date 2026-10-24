import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { repository } from '@/services/repository'
import { localDate } from '@/utils/date'
import { blankProfile, defaultTargets, type DiaryData } from '@/types'
import { errorMessage } from '@/lib/utils'
import { DiaryContext } from './useDiary'
// State can refresh independently while consumers retain the same context instance.
export function DiaryProvider({ children }: { children: ReactNode }) {
  const { demo, session } = useAuth()
  const userId = demo ? 'demo' : session!.user.id
  const repo = useMemo(() => repository(demo, userId), [demo, userId])
  const [date, setDate] = useState(localDate)
  const [data, setData] = useState<DiaryData>({
    profile: blankProfile(userId),
    targets: { ...defaultTargets, user_id: userId },
    foods: [],
    logs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const id = ++request.current
    setLoading(true)
    setError(null)
    try {
      const next = await repo.load(date)
      if (id === request.current) setData(next)
    } catch (error) {
      if (id === request.current) setError(errorMessage(error))
    } finally {
      if (id === request.current) setLoading(false)
    }
  }, [repo, date])
  useEffect(() => {
    void refresh()
    const focus = () => {
      void refresh()
    }
    window.addEventListener('focus', focus)
    return () => {
      window.removeEventListener('focus', focus)
    }
  }, [refresh])
  const mutate = async (action: () => Promise<void>) => {
    await action()
    await refresh()
  }
  return (
    <DiaryContext.Provider
      value={{
        ...data,
        date,
        setDate,
        loading,
        error,
        userId,
        refresh,
        saveLog: (log) => mutate(() => repo.saveLog(log)),
        deleteLog: (id) => mutate(() => repo.deleteLog(id)),
        saveFood: (food) => mutate(() => repo.saveFood(food)),
        deleteFood: (id) => mutate(() => repo.deleteFood(id)),
        saveProfile: (profile) => mutate(() => repo.saveProfile(profile)),
        saveTargets: (targets) => mutate(() => repo.saveTargets(targets)),
      }}
    >
      {children}
    </DiaryContext.Provider>
  )
}
