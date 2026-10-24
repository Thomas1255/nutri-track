import { useState } from 'react'
import { Coffee, Sun, Moon, Apple, Plus, Pencil, Utensils } from 'lucide-react'
import { useDiary } from '@/features/food-logging/useDiary'
import { meals, type FoodLog, type Meal } from '@/types'
import { totals } from '@/utils/nutrition'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FoodDialog } from '@/components/foods/FoodDialog'
import { EditLogDialog } from '@/components/foods/EditLogDialog'

const icons = { Breakfast: Coffee, Lunch: Sun, Dinner: Moon, Snacks: Apple }
const colors = { Breakfast: 'peach', Lunch: 'sage', Dinner: 'lavender', Snacks: 'yellow' }
export function MealList() {
  const { logs } = useDiary()
  const [adding, setAdding] = useState<Meal | null>(null),
    [editing, setEditing] = useState<FoodLog | null>(null)
  return (
    <>
      <div className="meal-list">
        {meals.map((meal) => {
          const entries = logs.filter((log) => log.meal === meal),
            total = totals(entries),
            Icon = icons[meal]
          return (
            <Card className="meal-card" key={meal}>
              <div className="meal-heading">
                <div className={`meal-icon ${colors[meal]}`}>
                  <Icon size={20} strokeWidth={1.7} />
                </div>
                <div className="meal-title">
                  <h3>{meal}</h3>
                  <p>
                    {entries.length
                      ? `${entries.length} ${entries.length === 1 ? 'food' : 'foods'} logged`
                      : 'A fresh space for your next meal'}
                  </p>
                </div>
                <strong className="meal-calories">
                  {Math.round(total.calories)}
                  <span>kcal</span>
                </strong>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Add food to ${meal}`}
                  onClick={() => setAdding(meal)}
                >
                  <Plus size={20} />
                </Button>
              </div>
              {entries.length ? (
                <div className="meal-entries">
                  {entries.map((log) => (
                    <button
                      className="food-entry"
                      key={log.id}
                      onClick={() => setEditing(log)}
                      aria-label={`Edit ${log.food_name}`}
                    >
                      <span className="food-entry-icon">
                        <Utensils size={15} strokeWidth={1.5} />
                      </span>
                      <span className="food-entry-name">
                        <strong>{log.food_name}</strong>
                        <small>
                          {log.quantity} × {log.serving_label}
                        </small>
                      </span>
                      <span className="food-entry-macros">
                        P {Math.round(log.protein)}
                        <i />C {Math.round(log.carbs)}
                        <i />F {Math.round(log.fat)}
                      </span>
                      <span className="food-entry-energy">
                        {Math.round(log.calories)}
                        <small>kcal</small>
                      </span>
                      <Pencil className="edit-hint" size={14} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="meal-empty">
                  <span>No foods logged yet.</span>
                  <button onClick={() => setAdding(meal)}>
                    <Plus size={14} />
                    Add your first food
                  </button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      {adding && (
        <FoodDialog
          open
          onOpenChange={(open) => {
            if (!open) setAdding(null)
          }}
          initialMeal={adding}
        />
      )}
      {editing && <EditLogDialog log={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
