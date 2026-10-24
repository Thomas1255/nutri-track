import { createContext, useContext } from 'react'
import type { Repository } from '@/services/repository'
import type { DiaryData } from '@/types'

type DiaryState = DiaryData &
  Omit<Repository, 'load'> & {
    date: string
    setDate: (date: string) => void
    loading: boolean
    error: string | null
    userId: string
    refresh: () => Promise<void>
  }

export const DiaryContext = createContext<DiaryState | null>(null)

export function useDiary() {
  const value = useContext(DiaryContext)
  if (!value) throw new Error('DiaryProvider is missing')
  return value
}
