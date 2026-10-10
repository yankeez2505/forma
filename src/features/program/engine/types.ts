import type { Exercise, Pattern } from "@/content/types"
import type { InjuryTag, Profile, TestRow } from "@/lib/schema"

export type ProfileInput = Pick<
  Profile,
  "sex" | "birth_year" | "goal" | "experience" | "days_per_week" | "session_min" | "injuries" | "equipment"
>
export type TestInput = TestRow["results"] & { date: string }

export interface Restrictions {
  /** no jumps or rope until the ankle checkpoint is passed */
  noImpact: boolean
  /** ankle warm-up block in every session */
  ankleRehab: boolean
  /** exercises whose contraindications intersect this list leave the pool */
  exclude: InjuryTag[]
}

export type Pool = Record<Pattern, Exercise[]>
export type Block = "warmup" | "main" | "finisher" | "cooldown"
export type DayType = "A" | "B" | "U" | "L"

export interface PlannedExercise {
  slug: string
  block: Block
  sets: number
  /** [min, max] reps per set; timed exercises use durationS instead */
  reps?: [number, number]
  durationS?: number
  targetRir: number
  loadKg?: number
  restS: number
  note?: string
}

export interface Slot {
  pattern: Pattern
  /** pattern to draw from when the main one has no candidates */
  fallback?: Pattern
  sets: number
}
export interface DayTemplate {
  dayType: DayType
  slots: Slot[]
}
export interface Template {
  kind: "fullbody" | "upperlower"
  days: DayTemplate[]
}

export interface SessionPlan {
  id: string
  date: string
  week: 1 | 2 | 3 | 4
  dayType: DayType
  exercises: PlannedExercise[]
  estMin: number
}

/** snapshot stored in programs.config: enough to regenerate the block deterministically */
export interface ProgramConfig {
  profile: ProfileInput
  baseline: TestInput
  latestTest: TestInput
  startDate: string
  seed: string
  generatorVersion: 1
  /** first day of the current block; defaults to startDate + 28 × blockIndex */
  blockStart?: string
}

export interface SetLog {
  slug: string
  setNo: number
  reps?: number
  durationS?: number
  weightKg?: number
  rir?: number
}
export interface SessionLog {
  date: string
  dayType?: DayType
  preSoreness?: number
  preSleep?: number
  preEnergy?: number
  rpe?: number
  sets: SetLog[]
  /** what the session asked for (planned_sessions.exercises); progression grades the sets against this dose */
  planned?: PlannedExercise[]
}
export interface CheckIn {
  soreness: number
  sleep: number
  energy: number
}

/** heaviest dumbbell at home: loads never progress past it */
export const DUMBBELL_KG = 10
