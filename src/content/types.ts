import type { EquipmentTag, InjuryTag } from "@/lib/schema"

export type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push_h"
  | "push_v"
  | "pull_h"
  | "pull_v"
  | "core"
  | "calf"
  | "mobility"
  | "cardio"
  | "arms"
  | "shoulder_iso"

export type Muscle =
  | "abdominals"
  | "hamstrings"
  | "adductors"
  | "quadriceps"
  | "biceps"
  | "shoulders"
  | "chest"
  | "middle back"
  | "calves"
  | "glutes"
  | "lower back"
  | "lats"
  | "triceps"
  | "traps"
  | "forearms"
  | "neck"
  | "abductors"

export interface Exercise {
  slug: string
  /** id in free-exercise-db, null for exercises without a source */
  sourceId: string | null
  pattern: Pattern
  level: 1 | 2 | 3
  /** empty = bodyweight / floor only */
  equipment: EquipmentTag[]
  impact: boolean
  contraindications: InjuryTag[]
  /** unique within a pattern; the engine progresses along it */
  difficultyRank: number
  timed: boolean
  unilateral: boolean
  /** animation id for the 3D figure, null = none yet */
  anim: string | null
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  /** "exercises/<slug>/0.webp" relative to the app base */
  images: string[]
  name: string
  cues: string[]
  reviewed: boolean
}
