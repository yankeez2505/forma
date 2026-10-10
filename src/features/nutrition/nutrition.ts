import { CATEGORY_ORDER, menuById, type Food, type Macros, type Menu, type MenuDay, type MenuGoal, type MenuItem } from "./foods"
import { targetId } from "@/features/program/model"
import { bmr, targets, tdee, type Targets } from "@/lib/calc"
import { parseISO } from "@/lib/dates"
import type { Rows, Upsertable } from "@/lib/db"
import type { Goal, NutritionTarget, Profile } from "@/lib/schema"

export type NutritionProfile = Pick<Profile, "sex" | "birth_year" | "height_cm" | "activity_level" | "goal" | "days_per_week">

export function nutritionFor(p: NutritionProfile, weightKg: number | undefined, today: string): Targets | null {
  if (weightKg === undefined) return null
  const age = parseISO(today).getFullYear() - p.birth_year
  const base = bmr({ sex: p.sex, weightKg, heightCm: p.height_cm, age })
  return targets({ tdee: tdee(base, p.activity_level, p.days_per_week), goal: p.goal, weightKg })
}

export function totals(items: MenuItem[], foods: Map<string, Food>): Macros {
  const sum = { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  for (const [id, grams] of items) {
    const f = foods.get(id)
    if (!f) continue
    const k = grams / 100
    sum.kcal += Math.round(f.per100.kcal * k)
    sum.protein += Math.round(f.per100.protein * k)
    sum.fat += Math.round(f.per100.fat * k)
    sum.carbs += Math.round(f.per100.carbs * k)
  }
  return sum
}

export const dayTotals = (day: MenuDay, foods: Map<string, Food>): Macros => totals(day.meals.flatMap((m) => m.items), foods)

export const MENU_FOR: Record<Goal, MenuGoal> = { fat: "deficit", muscle: "surplus", tone: "maintenance" }
export const GOAL_NOTE_RU: Record<Goal, string> = { fat: "дефицит −18 %", muscle: "профицит +8 %", tone: "поддержка" }
export const menuFor = (goal: Goal): Menu => menuById[MENU_FOR[goal]]

export function scaleMenu(menu: Menu, kcal: number): Menu {
  const factor = Math.min(1.6, Math.max(0.6, kcal / menu.baseKcal))
  const scale = (g: number) => Math.max(5, Math.round((g * factor) / 5) * 5)
  const days = menu.days.map((d) => ({ meals: d.meals.map((m) => ({ name: m.name, items: m.items.map(([id, g]) => [id, scale(g)] as MenuItem) })) }))
  return { ...menu, baseKcal: kcal, days }
}

export interface ShoppingLine { food: Food; grams: number; units?: number }

export function shoppingList(menu: Menu, foods: Map<string, Food>): ShoppingLine[] {
  const grams = new Map<string, number>()
  for (const day of menu.days) for (const meal of day.meals) for (const [id, g] of meal.items) grams.set(id, (grams.get(id) ?? 0) + g)
  const lines: ShoppingLine[] = []
  for (const [id, g] of grams) {
    const food = foods.get(id)
    if (!food) continue
    lines.push(food.unit ? { food, grams: g, units: Math.ceil(g / food.unit.grams) } : { food, grams: g })
  }
  return lines.sort((a, b) => CATEGORY_ORDER.indexOf(a.food.category) - CATEGORY_ORDER.indexOf(b.food.category) || a.food.name.localeCompare(b.food.name, "ru"))
}

export function targetRow(userId: string, today: string, t: Targets): Upsertable<"nutrition_targets"> {
  return { id: targetId(userId, today), date_from: today, ...t }
}

export function latestTarget(rows: Rows): NutritionTarget | undefined {
  let best: NutritionTarget | undefined
  for (const t of Object.values(rows.nutrition_targets)) if (!best || t.date_from > best.date_from) best = t
  return best
}

export function needsNewTarget(rows: Rows, t: Targets): boolean {
  const last = latestTarget(rows)
  return !last || last.kcal !== t.kcal || last.protein_g !== t.protein_g || last.fat_g !== t.fat_g || last.carbs_g !== t.carbs_g
}
