import { expect, it } from "vitest"
import { bmr, targets, tdee } from "."

it("bmr (Mifflin-St Jeor) rounds to a whole kcal", () => {
  expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, age: 35 })).toBe(1755)
  expect(bmr({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBe(1320)
})

it("tdee scales bmr by activity and adds 250 kcal per training day spread over the week", () => {
  expect(tdee(1755, "light", 3)).toBe(2520)
  expect(tdee(1755, "sedentary", 0)).toBe(2106)
})

it("targets for fat loss: −18 % kcal, 2 g/kg protein, 0.9 g/kg fat, carbs are the remainder", () => {
  expect(targets({ tdee: 2520, goal: "fat", weightKg: 80 })).toEqual({ kcal: 2066, protein_g: 160, fat_g: 72, carbs_g: 194 })
})

it("targets never drop carbs below 50 g", () => {
  expect(targets({ tdee: 1500, goal: "muscle", weightKg: 100 }).carbs_g).toBe(50)
})
