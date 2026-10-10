import type { Goal } from "@/lib/schema"
import type { PlannedExercise, SessionPlan } from "./types"

export interface WeekParams {
  rir: [number, number]
  setScale: number
}

/** block 0 stays far from failure while the habit forms; later blocks work closer; week 4 is always a deload */
export function weekParams(week: SessionPlan["week"], blockIndex: number): WeekParams {
  if (week === 4) return { rir: [4, 5], setScale: 0.6 }
  if (blockIndex === 0) return week === 3 ? { rir: [3, 3], setScale: 1 } : { rir: [4, 5], setScale: 1 }
  return week === 1 ? { rir: [3, 3], setScale: 1 } : { rir: [2, 3], setScale: 1 }
}

/** working sets per session: 8 in the first block, then by goal */
export function setCap(blockIndex: number, goal: Goal): number {
  if (blockIndex === 0) return 8
  return goal === "muscle" ? 14 : 12
}

export const totalMainSets = (exs: PlannedExercise[]): number =>
  exs.reduce((n, e) => n + (e.block === "main" ? e.sets : 0), 0)

/** trims one set at a time from the last main exercise backwards, round-robin, never below 1 set each; returns copies */
export function capSets(exs: PlannedExercise[], cap: number): PlannedExercise[] {
  const out = exs.map((e) => ({ ...e }))
  const main = out.filter((e) => e.block === "main")
  let total = totalMainSets(out)
  while (total > cap && main.some((e) => e.sets > 1)) {
    for (let i = main.length - 1; i >= 0 && total > cap; i--) {
      if (main[i].sets > 1) {
        main[i].sets--
        total--
      }
    }
  }
  return out
}
