import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ArrowUpRight, Flame, Target, Wheat, Droplets, Beef } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useDiary } from '@/features/food-logging/useDiary'
import { totals } from '@/utils/nutrition'

export function NutritionOverview() {
  const { logs, targets } = useDiary(),
    consumed = totals(logs)
  const remaining = targets.calories - Math.round(consumed.calories)
  const percent = Math.min((consumed.calories / targets.calories) * 100, 100)
  const macros = [
    { key: 'protein' as const, label: 'Protein', icon: Beef, color: '#bb8864', bg: '#f5eae1' },
    { key: 'carbs' as const, label: 'Carbs', icon: Wheat, color: '#91a477', bg: '#edf1e6' },
    { key: 'fat' as const, label: 'Fat', icon: Droplets, color: '#d3ad62', bg: '#faf2df' },
  ]
  return (
    <div className="nutrition-grid">
      <Card className="calorie-card">
        <div className="card-heading">
          <span>
            <Flame size={18} />
            Daily energy
          </span>
          <span className="tiny-label">KCAL</span>
        </div>
        <div className="energy-content">
          <div
            className="calorie-ring"
            role="img"
            aria-label={`${Math.round(consumed.calories)} of ${targets.calories} calories consumed`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: percent }, { value: 100 - percent }]}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="83%"
                  outerRadius="100%"
                  stroke="none"
                  isAnimationActive={false}
                  cornerRadius={10}
                >
                  <Cell fill="#315c45" />
                  <Cell fill="#edf0e9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="ring-label">
              <strong>{Math.round(consumed.calories).toLocaleString()}</strong>
              <span>kcal eaten</span>
            </div>
          </div>
          <div className="energy-numbers">
            <div>
              <i className="dot goal-dot" />
              <span>Daily goal</span>
              <strong>
                {targets.calories.toLocaleString()}
                <small>kcal</small>
              </strong>
            </div>
            <div>
              <i className="dot remaining-dot" />
              <span>{remaining < 0 ? 'Over goal' : 'Remaining'}</span>
              <strong>
                {Math.round(Math.abs(remaining)).toLocaleString()}
                <small>kcal</small>
              </strong>
            </div>
          </div>
        </div>
        <div className="energy-footer">
          <span>
            <Target size={14} />A little balance goes a long way.
          </span>
          <Link to="/profile" aria-label="Edit nutrition targets">
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </Card>
      <Card className="macro-card">
        <div className="card-heading">
          <span>Your daily macros</span>
          <span className="tiny-label">IN GRAMS</span>
        </div>
        <div className="macro-list">
          {macros.map(({ key, label, icon: Icon, color, bg }) => (
            <div className="macro-row" key={key}>
              <div className="macro-icon" style={{ color, backgroundColor: bg }}>
                <Icon size={19} strokeWidth={1.7} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="macro-label">
                  <strong>{label}</strong>
                  <span>
                    <b>{Math.round(consumed[key])}</b> / {targets[key]} g
                  </span>
                </div>
                <Progress
                  value={
                    targets[key] ? (consumed[key] / targets[key]) * 100 : consumed[key] ? 100 : 0
                  }
                  color={color}
                  aria-label={label}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
