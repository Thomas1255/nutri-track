import { useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, selectClass } from '@/components/ui/field'
import { ErrorState } from '@/components/ui/error-state'
import { useDiary } from '@/features/food-logging/useDiary'
import { meals, type FoodLog, type Meal } from '@/types'
import { scaleNutrition } from '@/utils/nutrition'
import { errorMessage } from '@/lib/utils'

export function EditLogDialog({ log, onClose }: { log: FoodLog; onClose: () => void }) {
  const { saveLog, deleteLog } = useDiary()
  const [quantity, setQuantity] = useState(String(log.quantity)),
    [meal, setMeal] = useState(log.meal)
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await saveLog({
        ...log,
        quantity: Number(quantity),
        meal,
        ...scaleNutrition(log.per_serving, Number(quantity)),
      })
      toast.success('Diary entry updated')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent
        title="A little adjustment."
        description={`${log.food_name} · ${log.serving_label}`}
      >
        {error && (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        )}
        <form onSubmit={save} className="space-y-5">
          <Field label="Quantity">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.01"
              max="1000"
              step="0.01"
              required
            />
          </Field>
          <Field label="Meal">
            <select
              className={selectClass}
              value={meal}
              onChange={(e) => setMeal(e.target.value as Meal)}
            >
              {meals.map((meal) => (
                <option key={meal}>{meal}</option>
              ))}
            </select>
          </Field>
          <p className="text-xs leading-5 text-muted-foreground">
            Nutrition uses the original food snapshot. Changes to the saved food won’t affect this
            entry.
          </p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}Save changes
          </Button>
        </form>
        {confirmDelete ? (
          <div className="mt-5 rounded-xl bg-destructive/5 p-4">
            <p className="mb-3 text-sm">Remove this entry from your diary?</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  try {
                    await deleteLog(log.id)
                    toast.success('Entry removed')
                    onClose()
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setPending(false)
                  }
                }}
              >
                Remove entry
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="mt-5 flex items-center gap-2 text-sm text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            Remove from diary
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
