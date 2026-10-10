import type { Sex } from "@/lib/schema"

export interface BmrInput {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}

/** Mifflin-St Jeor resting energy, kcal/day, whole number */
export function bmr({ sex, weightKg, heightCm, age }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === "male" ? base + 5 : base - 161)
}
