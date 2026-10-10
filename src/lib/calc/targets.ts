import type { Goal } from "@/lib/schema"

export interface Targets {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

const KCAL_FACTOR: Record<Goal, number> = { fat: 0.82, muscle: 1.08, tone: 1 }
const PROTEIN_G_PER_KG: Record<Goal, number> = { fat: 2.0, muscle: 1.8, tone: 1.6 }
const FAT_G_PER_KG = 0.9
const MIN_CARBS_G = 50

/** daily kcal and macros for a goal; carbs fill what is left (floored so the total never exceeds kcal) */
export function targets({ tdee, goal, weightKg }: { tdee: number; goal: Goal; weightKg: number }): Targets {
  const kcal = Math.round(tdee * KCAL_FACTOR[goal])
  const protein_g = Math.round(weightKg * PROTEIN_G_PER_KG[goal])
  const fat_g = Math.round(weightKg * FAT_G_PER_KG)
  const carbs_g = Math.max(MIN_CARBS_G, Math.floor((kcal - protein_g * 4 - fat_g * 9) / 4))
  return { kcal, protein_g, fat_g, carbs_g }
}
