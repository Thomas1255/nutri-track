import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDiary } from '@/features/food-logging/useDiary'
import { localDate, offsetDate, parseDate } from '@/utils/date'
import { Button } from '@/components/ui/button'

export function DateSelector() {
  const { date, setDate } = useDiary()
  const today = localDate(),
    selected = parseDate(date)
  const monday = offsetDate(date, -(selected.getDay() + 6) % 7)
  return (
    <div className="date-strip">
      <div className="date-strip-heading">
        <span>
          <CalendarDays size={17} />
          {selected.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-2">
          <button className="today-link" onClick={() => setDate(today)}>
            Today
          </button>
          <label className="calendar-picker" title="Choose a date">
            <CalendarDays size={17} />
            <span className="sr-only">Choose diary date</span>
            <input
              aria-label="Choose diary date"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value)
              }}
            />
          </label>
        </div>
      </div>
      <div className="week-row">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous week"
          onClick={() => setDate(offsetDate(date, -7))}
        >
          <ChevronLeft />
        </Button>
        <div className="week-days">
          {Array.from({ length: 7 }, (_, i) => {
            const day = offsetDate(monday, i),
              value = parseDate(day)
            return (
              <button
                key={day}
                className={`day-button ${day === date ? 'selected' : ''}`}
                onClick={() => setDate(day)}
                aria-pressed={day === date}
                aria-label={value.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              >
                <span>{value.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <strong>{value.getDate()}</strong>
                <i className={day === today ? 'is-today' : ''} />
              </button>
            )
          })}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next week"
          onClick={() => setDate(offsetDate(date, 7))}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
