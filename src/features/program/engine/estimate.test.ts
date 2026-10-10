import { expect, it } from "vitest"
import { estimateMinutes } from "./estimate"
import type { PlannedExercise } from "./types"

it("estimateMinutes: sets × (avg reps × 3 s or hold, plus rest), rounded up to whole minutes", () => {
  const main: PlannedExercise = { slug: "dumbbell-squat", block: "main", sets: 3, reps: [8, 12], targetRir: 4, restS: 60 }
  const hold: PlannedExercise = { slug: "plank", block: "main", sets: 1, durationS: 30, targetRir: 4, restS: 0 }
  expect(estimateMinutes([main, hold])).toBe(5)
  expect(estimateMinutes([{ ...main, sets: 2, reps: [5, 8] }])).toBe(3)
  expect(estimateMinutes([])).toBe(0)
})
