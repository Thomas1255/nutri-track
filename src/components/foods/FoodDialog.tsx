import { useEffect, useState } from 'react'
import { ArrowLeft, Check, LoaderCircle, Plus, Search, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, selectClass } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { useDiary } from '@/features/food-logging/useDiary'
import { demoFoods } from '@/services/demo'
import { getUsdaFood, searchUsda } from '@/services/usda'
import {
  completeNutrition,
  createLog,
  scaleNutrition,
  servingNutrition,
  validLogQuantity,
} from '@/utils/nutrition'
import { errorMessage } from '@/lib/utils'
import { meals, type Food, type Meal, type Serving } from '@/types'
import { FoodEditor } from './FoodEditor'

function servingsFor(food: Food): Serving[] {
  return (
    food.portions ?? [
      { label: `${food.serving_size} ${food.serving_unit}`, multiplier: 1 },
      ...(food.grams_per_serving ? [{ label: '1 g', multiplier: 1 / food.grams_per_serving }] : []),
    ]
  )
}
export function FoodDialog({
  open,
  onOpenChange,
  initialMeal = 'Snacks',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMeal?: Meal
}) {
  const { demo } = useAuth(),
    { foods, date, userId, saveLog } = useDiary()
  const [query, setQuery] = useState(''),
    [tab, setTab] = useState('search')
  const [results, setResults] = useState<Food[]>([]),
    [selected, setSelected] = useState<Food | null>(null)
  const [meal, setMeal] = useState<Meal>(initialMeal),
    [quantity, setQuantity] = useState('1'),
    [portionIndex, setPortionIndex] = useState('0')
  const [loading, setLoading] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [creating, setCreating] = useState(false)
  useEffect(() => {
    if (tab !== 'search' || selected) return
    const controller = new AbortController()
    const cleaned = query.trim()
    if (demo) {
      setResults(demoFoods.filter((f) => f.name.toLowerCase().includes(cleaned.toLowerCase())))
      setLoading(false)
      setError(null)
      return
    }
    setResults([])
    setError(null)
    if (cleaned.length < 2) {
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      searchUsda(cleaned, controller.signal)
        .then((foods) => {
          if (!controller.signal.aborted) setResults(foods)
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, demo, tab, selected])
  async function choose(food: Food) {
    setError(null)
    setPending(true)
    try {
      setSelected(food.fdc_id ? await getUsdaFood(food.fdc_id) : food)
      setPortionIndex('0')
      setQuantity('1')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  const servings = selected ? servingsFor(selected) : [],
    serving = servings[Number(portionIndex)]
  const amount = Number(quantity),
    valid = selected && completeNutrition(selected) && validLogQuantity(amount)
  const nutrition =
    valid && serving ? scaleNutrition(servingNutrition(selected, serving.multiplier), amount) : null
  const list =
    tab === 'custom'
      ? foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      : results
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) onOpenChange(value)
        }}
      >
        <DialogContent
          title={selected ? 'Make it your serving.' : 'A little nourishment.'}
          description={
            selected
              ? 'Choose your portion and add it to your diary.'
              : demo
                ? 'Explore sample foods or create your own. Live USDA search is available when you connect an account.'
                : 'Search USDA FoodData Central or choose one of your own foods.'
          }
        >
          {error && (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          )}
          {selected ? (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setSelected(null)
                  setError(null)
                }}
              >
                <ArrowLeft size={15} />
                Back to foods
              </button>
              <div className="selected-food">
                <span className="food-detail-icon">
                  <Utensils size={23} />
                </span>
                <div>
                  <h3>{selected.name}</h3>
                  <p>
                    {selected.brand ||
                      (selected.source === 'usda' ? `USDA · FDC ${selected.fdc_id}` : 'Your food')}
                    {selected.source === 'usda'
                      ? ' · per 100 g'
                      : ` · per ${selected.serving_size} ${selected.serving_unit}`}
                  </p>
                </div>
              </div>
              {!completeNutrition(selected) && (
                <div className="mb-4">
                  <ErrorState message="This record is missing a calorie or macro value. Choose another food or create a custom food using the nutrition label." />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Serving size">
                  <select
                    className={selectClass}
                    value={portionIndex}
                    onChange={(e) => setPortionIndex(e.target.value)}
                  >
                    {servings.map((serving, i) => (
                      <option value={i} key={i}>
                        {serving.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity">
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </Field>
              </div>
              <div className="nutrition-preview" aria-live="polite">
                {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
                  <div key={key}>
                    <strong>
                      {nutrition ? Math.round(nutrition[key] * 10) / 10 : '—'}
                      <small>{key === 'calories' ? '' : ' g'}</small>
                    </strong>
                    <span>{key === 'calories' ? 'kcal' : key}</span>
                  </div>
                ))}
              </div>
              <Field label="Add to meal">
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
              <Button
                className="mt-6 w-full"
                disabled={!valid || pending}
                onClick={async () => {
                  if (!selected || !serving) return
                  setPending(true)
                  setError(null)
                  try {
                    await saveLog(createLog(selected, date, meal, amount, serving, userId))
                    toast.success(`Added to ${meal.toLowerCase()}`)
                    onOpenChange(false)
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add to{' '}
                {meal.toLowerCase()}
              </Button>
            </>
          ) : (
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value)
                setError(null)
              }}
            >
              <TabsList>
                <TabsTrigger value="search">{demo ? 'Sample foods' : 'Search USDA'}</TabsTrigger>
                <TabsTrigger value="custom">My foods</TabsTrigger>
              </TabsList>
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-11"
                  placeholder={tab === 'custom' ? 'Find a saved food…' : 'Try “oats” or “chicken”…'}
                  aria-label="Search foods"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={120}
                />
              </div>
              {['search', 'custom'].map((value) => (
                <TabsContent key={value} value={value}>
                  <div className="food-search-results" aria-live="polite">
                    {loading && value === 'search' ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                      </div>
                    ) : list.length ? (
                      list.map((food) => (
                        <button
                          className="food-result"
                          key={food.id}
                          onClick={() => void choose(food)}
                          disabled={pending}
                        >
                          <span className="food-result-icon">
                            <Utensils size={18} />
                          </span>
                          <span className="food-result-name">
                            <strong>{food.name}</strong>
                            <small>
                              {food.brand ||
                                (food.source === 'usda'
                                  ? 'USDA FoodData Central'
                                  : 'Custom food')}{' '}
                              · {food.serving_size} {food.serving_unit}
                            </small>
                          </span>
                          <span className="food-result-kcal">
                            {food.calories === null ? '—' : Math.round(food.calories)}
                            <small>kcal</small>
                          </span>
                          <Plus size={17} />
                        </button>
                      ))
                    ) : (
                      <div className="search-empty">
                        <Search size={28} />
                        <h3>
                          {value === 'custom'
                            ? 'Your food collection starts here.'
                            : query.trim().length < 2
                              ? 'What’s on your plate?'
                              : 'No foods found.'}
                        </h3>
                        <p>
                          {value === 'custom'
                            ? 'Save a favorite recipe or a food from its label.'
                            : query.trim().length < 2
                              ? 'Enter at least two characters to search.'
                              : 'Try a simpler name or create your own food.'}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
              <div className="search-footer">
                <span>
                  <Check size={14} />
                  {demo ? 'Illustrative sample nutrition' : 'Nutrition data from USDA'}
                </span>
                <button onClick={() => setCreating(true)}>
                  Create food
                  <Plus size={14} />
                </button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {creating && (
        <FoodEditor
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            setTab('custom')
            setQuery('')
          }}
        />
      )}
    </>
  )
}
