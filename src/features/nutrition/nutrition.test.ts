import { expect, it } from "vitest"
import { ownerProfileRow } from "@/features/program/engine/fixtures/rows"
import { bmr, tdee, targets } from "@/lib/calc"
import { CATEGORY_ORDER, foodById, menuById } from "./foods"
import { dayTotals, menuFor, nutritionFor, scaleMenu, shoppingList, totals } from "./nutrition"

const round5 = (g: number, f: number) => Math.max(5, Math.round((g * f) / 5) * 5)

it("nutritionFor: age from today, activity and training days; null without weight", () => {
  expect(nutritionFor(ownerProfileRow, undefined, "2026-10-12")).toBeNull()
  const expected = targets({ tdee: tdee(bmr({ sex: "male", weightKg: 82, heightCm: 180, age: 36 }), "light", 3), goal: "fat", weightKg: 82 })
  expect(nutritionFor(ownerProfileRow, 82, "2026-10-12")).toEqual(expected)
  expect(expected.kcal).toBeGreaterThan(1500)
  expect(expected.kcal).toBeLessThan(2500)
})
it("totals rounds and skips unknown ids; dayTotals sums the meals", () => {
  const e = foodById.get("egg")!.per100
  expect(totals([["egg", 110], ["nope", 100]], foodById)).toEqual({ kcal: Math.round(e.kcal * 1.1), protein: Math.round(e.protein * 1.1), fat: Math.round(e.fat * 1.1), carbs: Math.round(e.carbs * 1.1) })
  expect(totals([], foodById)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 })
  const day = menuById.deficit.days[0]
  expect(dayTotals(day, foodById).kcal).toBe(day.meals.reduce((a, meal) => a + totals(meal.items, foodById).kcal, 0))
})
it("menuFor maps goals; scaleMenu scales grams within [0.6, 1.6] rounding to 5 g", () => {
  expect([menuFor("fat").id, menuFor("muscle").id, menuFor("tone").id]).toEqual(["deficit", "surplus", "maintenance"])
  const m = menuById.deficit
  const [id, g] = m.days[0].meals[0].items[0]
  const scaled = scaleMenu(m, 1980)
  expect(scaled.baseKcal).toBe(1980)
  expect(scaled.days[0].meals[0].items[0]).toEqual([id, round5(g, 1.1)])
  expect(scaleMenu(m, 500).days[0].meals[0].items[0][1]).toBe(round5(g, 0.6))
  expect(scaleMenu(m, 9000).days[0].meals[0].items[0][1]).toBe(round5(g, 1.6))
  expect(Math.abs(dayTotals(scaled.days[0], foodById).kcal - 1980) / 1980).toBeLessThan(0.15)
  expect(m.days[0].meals[0].items[0][1]).toBe(g)   // source menu untouched
})
it("shoppingList sums the week per food in category order and adds units", () => {
  const menu = menuById.deficit
  const list = shoppingList(menu, foodById)
  const weekItems = menu.days.flatMap((d) => d.meals.flatMap((m) => m.items))
  const eggGrams = weekItems.filter(([id]) => id === "egg").reduce((a, [, g]) => a + g, 0)
  expect(eggGrams).toBeGreaterThan(0)
  const egg = list.find((x) => x.food.id === "egg")!
  expect(egg.grams).toBe(eggGrams)
  expect(egg.units).toBe(Math.ceil(eggGrams / foodById.get("egg")!.unit!.grams))
  expect(list.find((x) => x.food.id === "oil-olive")?.units).toBeUndefined()
  expect(new Set(list.map((x) => x.food.id)).size).toBe(list.length)
  expect(new Set(list.map((x) => x.food.id))).toEqual(new Set(weekItems.map(([id]) => id)))
  const order = list.map((x) => CATEGORY_ORDER.indexOf(x.food.category))
  expect(order).toEqual([...order].sort((a, b) => a - b))
})
