import { lazy, Suspense, useState } from 'react'
import { ArrowUpRight, ChevronRight, Leaf, Plus, Sprout, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDiary } from '@/features/food-logging/useDiary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DateSelector } from '@/components/dashboard/DateSelector'
import { MealList } from '@/components/dashboard/MealList'
import { FoodDialog } from '@/components/foods/FoodDialog'
import { dateTitle, localDate } from '@/utils/date'
import { totals } from '@/utils/nutrition'

const NutritionOverview = lazy(() =>
  import('@/components/dashboard/NutritionOverview').then((module) => ({
    default: module.NutritionOverview,
  })),
)

export function DashboardPage({ diaryOnly = false }: { diaryOnly?: boolean }) {
  const { profile, date, logs, loading } = useDiary()
  const [adding, setAdding] = useState(false)
  const consumed = totals(logs),
    mealsLogged = new Set(logs.map((log) => log.meal)).size
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {diaryOnly ? 'ONE MEAL AT A TIME' : 'A LITTLE BETTER, EVERY DAY'}
          </p>
          <h1>
            {diaryOnly ? (
              'Your food diary'
            ) : (
              <>
                Your daily overview<span className="heading-dot">.</span>
              </>
            )}
          </h1>
          <p>
            {diaryOnly
              ? 'A simple record of what nourishes you.'
              : `${profile.display_name ? `Hey ${profile.display_name}, l` : 'L'}et’s make room for a little balance.`}
          </p>
        </div>
        <Button className="add-food-button" onClick={() => setAdding(true)}>
          <Plus />
          Add food
        </Button>
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <DateSelector />
          <Suspense fallback={<Skeleton className="h-64" />}>
            {loading ? (
              <div aria-label="Loading nutrition" className="nutrition-grid">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : (
              <NutritionOverview />
            )}
          </Suspense>
          <div className="section-heading">
            <div>
              <h2>{date === localDate() ? 'Today’s meals' : 'Your meals'}</h2>
              <span>{dateTitle(date)}</span>
            </div>
            <span className="meal-count">
              <span className="meal-progress-dots" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <i key={index} className={index < mealsLogged ? 'filled' : ''} />
                ))}
              </span>
              {mealsLogged} of 4 meals logged
            </span>
          </div>
          {loading ? (
            <div className="space-y-4" aria-label="Loading meals">
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <MealList />
          )}
        </div>
        <aside className="dashboard-aside">
          <Card className="mindful-card">
            <div className="mindful-art">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <Sprout size={100} strokeWidth={1.05} />
              <span className="art-star star-one">✧</span>
              <span className="art-star star-two">✧</span>
            </div>
            <span className="eyebrow">FOOD FOR THOUGHT</span>
            <h2>
              Small steps.
              <br />A healthier you.
            </h2>
            <p>
              Progress isn’t about a perfect day. It’s about the little choices you keep coming back
              to.
            </p>
            <div className="mindful-footer">
              <Leaf size={15} />
              You’re growing good habits.
            </div>
          </Card>
          <Card className="day-summary">
            <div className="card-heading">
              <span>A moment to check in</span>
              <span className="small-sun">☀</span>
            </div>
            <div className="summary-stat">
              <span className="summary-check">
                <Check size={15} />
              </span>
              <div>
                <strong>{logs.length} foods logged</strong>
                <p>Every entry adds a little awareness.</p>
              </div>
            </div>
            <div className="summary-stat">
              <span className="summary-check">
                <Leaf size={15} />
              </span>
              <div>
                <strong>{Math.round(consumed.protein)} g of protein</strong>
                <p>A little nourishment for your day.</p>
              </div>
            </div>
            <Link to="/profile" className="summary-link">
              Your goals, your way
              <ArrowUpRight size={16} />
            </Link>
          </Card>
          <div className="custom-food-note">
            <div className="note-icon">
              <Plus size={18} />
            </div>
            <h3>Something homemade?</h3>
            <p>Save your own foods and make logging them a little easier.</p>
            <Link to="/foods">
              Create a custom food
              <ChevronRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
      {adding && <FoodDialog open onOpenChange={setAdding} />}
    </>
  )
}
