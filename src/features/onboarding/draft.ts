import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Exercise } from "@/content/types"
import { metricId, newConfig, profileInput, testId } from "@/features/program/model"
import { buildProgram, type ProgramRows } from "@/features/program/programService"
import { jsonStorage, type Upsertable } from "@/lib/db"
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

export interface OnboardingContext {
  userId: string
  today: string
  timezone: string
  seed: string
}
export interface OnboardingRows {
  profile: Upsertable<"profiles">
  metric: Upsertable<"body_metrics">
  test: Upsertable<"tests">
  program: ProgramRows
}

/** everything "Начать программу" writes: profile, today's weight, the baseline test and block 0 */
export function onboardingRows(d: OnboardingDraft, ctx: OnboardingContext, exercises: Exercise[]): OnboardingRows {
  if (!draftComplete(d)) throw new Error("draft incomplete")
  const f = d as Required<OnboardingDraft>
  const profile: Upsertable<"profiles"> = {
    id: ctx.userId, sex: f.sex, birth_year: f.birth_year, height_cm: f.height_cm, country: "BY", timezone: ctx.timezone,
    goal: f.goal, experience: f.experience, days_per_week: f.days_per_week, session_min: f.session_min,
    activity_level: f.activity_level, injuries: f.injuries, equipment: f.equipment, figure: f.sex,
  }
  const baseline = { ...f.test, date: ctx.today }
  return {
    profile,
    metric: { id: metricId(ctx.userId, ctx.today), date: ctx.today, weight_kg: f.weight_kg, waist_cm: null, neck_cm: null, hip_cm: null },
    test: { id: testId(ctx.userId, ctx.today, "baseline"), date: ctx.today, kind: "baseline", results: f.test },
    program: buildProgram(newConfig(profileInput(f), baseline, ctx.today, ctx.seed), exercises, []),
  }
}

interface OnboardingStore {
  draft: OnboardingDraft
  patch(p: Partial<OnboardingDraft>): void
  reset(): void
}
/** the survey in progress survives a closed tab */
export const useOnboarding = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: emptyDraft(),
      patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      reset: () => set({ draft: emptyDraft() }),
    }),
    { name: "forma-onboarding", storage: jsonStorage() },
  ),
)
