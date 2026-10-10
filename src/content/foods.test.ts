import { expect, it } from "vitest"
import { z } from "zod"
import foods from "./foods.json"
import menus from "./menus.json"

const CATEGORIES = ["dairy", "eggs", "meat", "fish", "grain", "bread", "legume", "vegetable", "fruit", "fat", "other"] as const
const Food = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), name: z.string().min(2), category: z.enum(CATEGORIES), countries: z.array(z.string().length(2)).min(1),
  per100: z.strictObject({ kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), fat: z.number().min(0).max(100), carbs: z.number().min(0).max(100) }),
  unit: z.strictObject({ name: z.string().min(1), grams: z.number().positive() }).optional(),
})
const Menu = z.strictObject({
  id: z.enum(["deficit", "maintenance", "surplus"]), title: z.string().min(2), baseKcal: z.number().int().min(1200).max(4000),
  days: z.array(z.strictObject({ meals: z.array(z.strictObject({ name: z.string().min(2), items: z.array(z.tuple([z.string(), z.number().min(5).max(600)])).min(1) })).min(3).max(5) })).length(7),
})
const F = z.array(Food).min(100).parse(foods)
const M = z.array(Menu).length(3).parse(menus)
const byId = new Map(F.map((f) => [f.id, f]))
const kcalOf = (items: [string, number][]) => items.reduce((a, [id, g]) => a + (byId.get(id)!.per100.kcal * g) / 100, 0)
const proteinOf = (items: [string, number][]) => items.reduce((a, [id, g]) => a + (byId.get(id)!.per100.protein * g) / 100, 0)

it("foods: unique ids and names, every item available in BY, macros consistent with kcal (Atwater)", () => {
  expect(new Set(F.map((f) => f.id)).size).toBe(F.length)
  expect(new Set(F.map((f) => f.name)).size).toBe(F.length)
  expect(F.every((f) => f.countries.includes("BY"))).toBe(true)
  const off = F.filter((f) => Math.abs(f.per100.kcal - (4 * f.per100.protein + 9 * f.per100.fat + 4 * f.per100.carbs)) > Math.max(25, 0.15 * f.per100.kcal))
  expect(off.map((f) => f.id)).toEqual([])
  const count = (c: string) => F.filter((f) => f.category === c).length
  expect(count("dairy")).toBeGreaterThanOrEqual(8)
  expect(count("meat")).toBeGreaterThanOrEqual(8)
  expect(count("fish")).toBeGreaterThanOrEqual(6)
  expect(count("vegetable")).toBeGreaterThanOrEqual(12)
  expect(count("fruit")).toBeGreaterThanOrEqual(8)
  expect(count("grain")).toBeGreaterThanOrEqual(8)
})
it("menus: three goals, items reference known foods, days differ, totals near baseKcal with 22–40 % protein", () => {
  expect(M.map((m) => [m.id, m.baseKcal])).toEqual([["deficit", 1800], ["maintenance", 2200], ["surplus", 2600]])
  for (const m of M) {
    const missing = m.days.flatMap((d) => d.meals.flatMap((meal) => meal.items.map(([id]) => id))).filter((id) => !byId.has(id))
    expect(missing).toEqual([])
    expect(new Set(m.days.map((d) => JSON.stringify(d))).size).toBe(7)
    for (const [i, d] of m.days.entries()) {
      const items = d.meals.flatMap((meal) => meal.items)
      const kcal = kcalOf(items)
      const share = (proteinOf(items) * 4) / kcal
      expect(Math.abs(kcal - m.baseKcal) / m.baseKcal, `${m.id} day ${i + 1} kcal ${kcal.toFixed(0)}`).toBeLessThanOrEqual(0.12)
      expect(share, `${m.id} day ${i + 1} protein share ${share.toFixed(2)}`).toBeGreaterThanOrEqual(0.22)
      expect(share).toBeLessThanOrEqual(0.4)
    }
  }
})
