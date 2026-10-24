import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'
export function Progress({
  value,
  className,
  color,
  'aria-label': label,
}: {
  value: number
  className?: string
  color?: string
  'aria-label'?: string
}) {
  const bounded = Math.max(0, Math.min(100, value))
  return (
    <ProgressPrimitive.Root
      value={bounded}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full rounded-full bg-primary transition-transform duration-500"
        style={{ backgroundColor: color, transform: `translateX(-${100 - bounded}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}
