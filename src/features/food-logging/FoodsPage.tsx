import { useState } from 'react'
import { Plus, Search, Utensils, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDiary } from './useDiary'
import { FoodEditor } from '@/components/foods/FoodEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/utils'
import type { Food } from '@/types'

export function FoodsPage() {
  const { foods, deleteFood, loading } = useDiary()
  const [editor, setEditor] = useState<Food | 'new' | null>(null),
    [deleting, setDeleting] = useState<Food | null>(null),
    [pending, setPending] = useState(false),
    [query, setQuery] = useState('')
  const filtered = foods.filter((food) => food.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FAMILIAR FAVORITES</p>
          <h1>
            Your own little collection<span className="heading-dot">.</span>
          </h1>
          <p>Homemade, hard to find, or simply a favorite. Save it here.</p>
        </div>
        <Button onClick={() => setEditor('new')}>
          <Plus />
          Create food
        </Button>
      </div>
      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute left-3.5 top-3.5 text-muted-foreground" />
        <Input
          className="pl-11"
          placeholder="Find one of your foods…"
          aria-label="Find custom foods"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading ? (
        <Skeleton className="h-60" />
      ) : foods.length ? (
        <div className="custom-food-grid">
          {filtered.map((food) => (
            <Card className="custom-food-card" key={food.id}>
              <span className="food-detail-icon">
                <Utensils size={22} />
              </span>
              <h2>{food.name}</h2>
              <p>
                Per {food.serving_size} {food.serving_unit}
              </p>
              <div className="custom-food-nutrients">
                <strong>
                  {food.calories}
                  <small> kcal</small>
                </strong>
                <span>
                  P {food.protein} · C {food.carbs} · F {food.fat} g
                </span>
              </div>
              <div className="flex justify-end border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={() => setEditor(food)}>
                  <Pencil />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${food.name}`}
                  onClick={() => setDeleting(food)}
                >
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
          {!filtered.length && (
            <p className="text-sm text-muted-foreground">No foods match your search.</p>
          )}
        </div>
      ) : (
        <Card className="collection-empty">
          <div className="empty-illustration">
            <Utensils size={40} strokeWidth={1.25} />
          </div>
          <h2>A place for your favorites.</h2>
          <p>
            Build a collection of the foods you love.
            <br />
            Create your first food, then find it in “My foods” when logging a meal.
          </p>
          <Button onClick={() => setEditor('new')}>
            <Plus />
            Create your first food
          </Button>
        </Card>
      )}
      {editor && (
        <FoodEditor food={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />
      )}
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDeleting(null)
          }}
        >
          <DialogContent
            title="Remove this saved food?"
            description={`${deleting.name} will leave your collection. Its existing diary entries and nutrition snapshots will stay.`}
          >
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>
                Keep food
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  try {
                    await deleteFood(deleting.id)
                    setDeleting(null)
                    toast.success('Food removed')
                  } catch (e) {
                    toast.error(errorMessage(e))
                  } finally {
                    setPending(false)
                  }
                }}
              >
                Remove food
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
