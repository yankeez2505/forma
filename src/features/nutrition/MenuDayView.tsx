import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Targets } from "@/lib/calc"
import { foodById, type MenuDay, type MenuItem } from "./foods"
import { dayTotals, totals } from "./nutrition"

const itemText = ([id, grams]: MenuItem) => {
  const food = foodById.get(id)
  if (!food) return `${id} — ${grams} г`
  const unit = food.unit
  const units = unit ? ` · ${Math.max(1, Math.round(grams / unit.grams))} ${unit.name}` : ""
  return `${food.name} — ${grams} г${units}`
}

/** one menu day: a card per meal with its kcal, then the day totals next to the target */
export function MenuDayView({ day, target }: { day: MenuDay; target: Targets }) {
  const sum = dayTotals(day, foodById)
  return (
    <div className="grid gap-3">
      {day.meals.map((meal) => (
        <Card key={meal.name} className="gap-3 py-4">
          <CardHeader>
            <CardTitle className="text-base">{meal.name}</CardTitle>
            <CardAction className="text-sm text-muted-foreground tabular-nums">{totals(meal.items, foodById).kcal} ккал</CardAction>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {meal.items.map((item) => (
                <li key={item[0]}>{itemText(item)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm tabular-nums">
        {sum.kcal} ккал · Б {sum.protein} · Ж {sum.fat} · У {sum.carbs}
        <span className="text-muted-foreground"> · цель {target.kcal} · {target.protein_g} / {target.fat_g} / {target.carbs_g}</span>
      </p>
    </div>
  )
}
