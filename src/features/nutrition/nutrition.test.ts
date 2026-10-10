import { expect, it } from "vitest"
import { ownerProfileRow } from "@/features/program/engine/fixtures/rows"
import { bmr, tdee, targets } from "@/lib/calc"
import { nutritionFor } from "./nutrition"

it("nutritionFor: age from today, activity and training days; null without weight", () => {
  expect(nutritionFor(ownerProfileRow, undefined, "2026-10-12")).toBeNull()
  const expected = targets({ tdee: tdee(bmr({ sex: "male", weightKg: 82, heightCm: 180, age: 36 }), "light", 3), goal: "fat", weightKg: 82 })
  expect(nutritionFor(ownerProfileRow, 82, "2026-10-12")).toEqual(expected)
  expect(expected.kcal).toBeGreaterThan(1500)
  expect(expected.kcal).toBeLessThan(2500)
})
