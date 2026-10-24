import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, selectClass } from '@/components/ui/field'
import { ErrorState } from '@/components/ui/error-state'
import { useDiary } from '@/features/food-logging/useDiary'
import { type Food } from '@/types'
import { errorMessage } from '@/lib/utils'

export function FoodEditor({
  food,
  onClose,
  onSaved,
}: {
  food?: Food
  onClose: () => void
  onSaved?: () => void
}) {
  const { saveFood, userId } = useDiary()
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name')).trim(),
      unit = String(values.get('serving_unit'))
    if (!name) {
      setError('Enter a food name.')
      return
    }
    const servingSize = Number(values.get('serving_size'))
    setPending(true)
    setError(null)
    try {
      await saveFood({
        id: food?.id ?? crypto.randomUUID(),
        user_id: userId,
        name,
        brand: null,
        source: 'custom',
        fdc_id: null,
        serving_size: servingSize,
        serving_unit: unit,
        grams_per_serving:
          unit === 'g' ? servingSize : unit === 'oz' ? servingSize * 28.349523125 : null,
        calories: Number(values.get('calories')),
        protein: Number(values.get('protein')),
        carbs: Number(values.get('carbs')),
        fat: Number(values.get('fat')),
      })
      toast.success(
        food
          ? 'Food updated. Existing diary entries are unchanged.'
          : 'Your food is ready to reuse',
      )
      ;(onSaved ?? onClose)()
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
        title={food ? 'Fine-tune your food.' : 'Something of your own.'}
        description="Enter nutrition from your label or recipe, for the serving size below."
      >
        {error && (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <Field label="Food name">
            <Input
              name="name"
              placeholder="e.g. Homemade granola"
              required
              maxLength={160}
              defaultValue={food?.name}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Serving size">
              <Input
                name="serving_size"
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                defaultValue={food?.serving_size ?? 1}
                required
              />
            </Field>
            <Field label="Unit">
              <select
                name="serving_unit"
                className={selectClass}
                defaultValue={food?.serving_unit ?? 'serving'}
              >
                {['serving', 'g', 'ml', 'oz', 'cup', 'piece', 'tbsp', 'tsp'].map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
              <Field
                key={key}
                label={
                  key === 'calories'
                    ? 'Calories (kcal)'
                    : `${key.charAt(0).toUpperCase() + key.slice(1)} (g)`
                }
              >
                <Input
                  name={key}
                  type="number"
                  min="0"
                  max={key === 'calories' ? 10000 : 1000}
                  step="0.01"
                  defaultValue={food?.[key] ?? ''}
                  required
                />
              </Field>
            ))}
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <LoaderCircle className="animate-spin" />}
            {food ? 'Save food' : 'Create food'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
