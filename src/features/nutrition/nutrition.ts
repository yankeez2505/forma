import { bmr, targets, tdee, type Targets } from "@/lib/calc"
import { parseISO } from "@/lib/dates"
import type { Profile } from "@/lib/schema"

export type NutritionProfile = Pick<Profile, "sex" | "birth_year" | "height_cm" | "activity_level" | "goal" | "days_per_week">

export function nutritionFor(p: NutritionProfile, weightKg: number | undefined, today: string): Targets | null {
  if (weightKg === undefined) return null
  const age = parseISO(today).getFullYear() - p.birth_year
  const base = bmr({ sex: p.sex, weightKg, heightCm: p.height_cm, age })
  return targets({ tdee: tdee(base, p.activity_level, p.days_per_week), goal: p.goal, weightKg })
}
