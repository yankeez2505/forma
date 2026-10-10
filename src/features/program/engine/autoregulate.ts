import { estimateMinutes } from "./estimate"
import type { CheckIn, SessionPlan } from "./types"

export const EASED_NOTE = "Облегчено по самочувствию"

/** sore, under-slept or drained → the session gets lighter instead of being skipped */
export const needsEasing = (c: CheckIn): boolean => c.soreness >= 4 || c.sleep <= 2 || c.energy <= 2

export function autoregulate(s: SessionPlan, c: CheckIn): SessionPlan {
  if (!needsEasing(c)) return s
  const exercises = s.exercises.map((e) =>
    e.block === "main"
      ? { ...e, sets: Math.max(1, e.sets - 1), targetRir: e.targetRir + 1, note: e.note ? `${e.note} · ${EASED_NOTE}` : EASED_NOTE }
      : e,
  )
  return { ...s, exercises, estMin: estimateMinutes(exercises) }
}
