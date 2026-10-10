import type { PlannedExercise } from "./types"

const SECONDS_PER_REP = 3

/** seconds one exercise takes: work per set (3 s per rep at the middle of the range, or the hold) plus rest, times sets */
export function exerciseSeconds(e: PlannedExercise): number {
  const work = e.reps ? ((e.reps[0] + e.reps[1]) / 2) * SECONDS_PER_REP : (e.durationS ?? 0)
  return e.sets * (work + e.restS)
}

/** whole minutes for a session, rounded up */
export const estimateMinutes = (exs: PlannedExercise[]): number =>
  Math.ceil(exs.reduce((total, e) => total + exerciseSeconds(e), 0) / 60)
