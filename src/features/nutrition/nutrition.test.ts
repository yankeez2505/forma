import { expect, it } from "vitest"
import { ownerProfileRow } from "@/features/program/engine/fixtures/rows"
import { bmr, tdee, targets } from "@/lib/calc"
import { foodById, menuById } from "./foods"
import { dayTotals, nutritionFor, totals } from "./nutrition"

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
