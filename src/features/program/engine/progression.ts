import type { Exercise } from "@/content/types"
import { DUMBBELL_KG, type PlannedExercise, type SetLog } from "./types"

export const MAX_HOLD_S = 90
export const MAX_SETS = 5
const HOLD_STEP_S = 5
const START_REPS: [number, number] = [8, 12]
const START_HOLD_S = 30

/** every planned set was logged and each one reached the top of the rep range (or the hold target) */
export function hitTop(sets: SetLog[], ex: PlannedExercise): boolean {
  if (sets.length < ex.sets) return false
  if (ex.durationS !== undefined) {
    const target = ex.durationS
    return sets.every((s) => (s.durationS ?? 0) >= target)
  }
  const top = ex.reps?.[1] ?? Infinity
  return sets.every((s) => (s.reps ?? 0) >= top)
}

/** the plan for the next session given the last two logs of this exercise; `pattern` is the pool list sorted by rank */
export function progressExercise(prev: PlannedExercise, lastTwo: SetLog[][], pattern: Exercise[], current: Exercise): PlannedExercise {
  const base = prev.loadKg !== undefined && prev.loadKg > DUMBBELL_KG ? { ...prev, loadKg: DUMBBELL_KG } : prev
  if (lastTwo.length < 2 || !lastTwo.every((sets) => hitTop(sets, prev))) return base
  if (prev.durationS !== undefined && prev.durationS < MAX_HOLD_S) {
    return { ...base, durationS: Math.min(MAX_HOLD_S, prev.durationS + HOLD_STEP_S) }
  }
  const next = pattern.find((e) => e.difficultyRank > current.difficultyRank)
  if (next) return switchVariant(base, next)
  if (prev.sets < MAX_SETS) return { ...base, sets: prev.sets + 1 }
  return base
}

function switchVariant(prev: PlannedExercise, next: Exercise): PlannedExercise {
  const out: PlannedExercise = { slug: next.slug, block: prev.block, sets: prev.sets, targetRir: prev.targetRir, restS: next.timed ? 30 : 60 }
  if (next.timed) out.durationS = START_HOLD_S
  else out.reps = START_REPS
  if (next.equipment.includes("dumbbell")) out.loadKg = DUMBBELL_KG
  if (prev.note) out.note = prev.note
  return out
}
