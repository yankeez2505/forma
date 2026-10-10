import { expect, it } from "vitest"
import { bmr, tdee } from "."

it("bmr (Mifflin-St Jeor) rounds to a whole kcal", () => {
  expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, age: 35 })).toBe(1755)
  expect(bmr({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBe(1320)
})

it("tdee scales bmr by activity and adds 250 kcal per training day spread over the week", () => {
  expect(tdee(1755, "light", 3)).toBe(2520)
  expect(tdee(1755, "sedentary", 0)).toBe(2106)
})
