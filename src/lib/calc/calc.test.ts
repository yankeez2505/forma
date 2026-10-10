import { expect, it } from "vitest"
import { bmr } from "."

it("bmr (Mifflin-St Jeor) rounds to a whole kcal", () => {
  expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, age: 35 })).toBe(1755)
  expect(bmr({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBe(1320)
})
