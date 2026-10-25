import { AppLayout } from '@/components/layout/AppLayout'
import { DiaryProvider } from './DiaryProvider'

export function DiaryApp({ accountId }: { accountId: string }) {
  return (
    <DiaryProvider key={accountId}>
      <AppLayout />
    </DiaryProvider>
  )
}
