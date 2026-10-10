import type { ActivityLevel } from "@/lib/schema"

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }

/** ~250 kcal per home session, averaged over the week */
const KCAL_PER_TRAINING_DAY = 250

/** daily energy expenditure, kcal, whole number */
export function tdee(bmr: number, activity: ActivityLevel, trainingDays: number): number {
  return Math.round(bmr * ACTIVITY_FACTOR[activity] + (trainingDays * KCAL_PER_TRAINING_DAY) / 7)
}
