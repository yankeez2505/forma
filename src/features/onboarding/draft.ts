import type { ActivityLevel, EquipmentTag, Experience, Goal, InjuryTag, Sex, TestRow } from "@/lib/schema"

export const STEPS = ["about", "goal", "regime", "equipment", "injuries", "test", "summary"] as const

export interface OnboardingDraft {
  step: number
  sex?: Sex
  birth_year?: number
  height_cm?: number
  weight_kg?: number
  goal?: Goal
  experience?: Experience
  activity_level?: ActivityLevel
  days_per_week?: 2 | 3 | 4
  session_min?: 20 | 30 | 45
  equipment: EquipmentTag[]
  injuries: InjuryTag[]
  test?: TestRow["results"]
}

export const emptyDraft = (): OnboardingDraft => ({ step: 0, equipment: ["mat"], injuries: [] })

const within = (n: number | undefined, min: number, max: number) => n !== undefined && n >= min && n <= max

export function stepValid(d: OnboardingDraft, step: number): boolean {
  switch (STEPS[step]) {
    case "about":
      return d.sex !== undefined && within(d.birth_year, 1920, 2020) && within(d.height_cm, 120, 230) && within(d.weight_kg, 30, 300)
    case "goal":
      return d.goal !== undefined
    case "regime":
      return d.experience !== undefined && d.activity_level !== undefined && d.days_per_week !== undefined && d.session_min !== undefined
    case "equipment":
    case "injuries":
      return true // no gear is fine: bodyweight plus a chair and a wall
    case "test":
      return d.test !== undefined && (!d.injuries.includes("ankle") || d.test.ankle !== undefined)
    case "summary":
      return draftComplete(d)
    default:
      return false
  }
}

export const draftComplete = (d: OnboardingDraft) => STEPS.slice(0, 6).every((_, i) => stepValid(d, i))
