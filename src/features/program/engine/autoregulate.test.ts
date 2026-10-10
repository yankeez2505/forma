import { expect, it } from "vitest"
import { autoregulate } from "./autoregulate"
import { estimateMinutes } from "./estimate"
import type { PlannedExercise, SessionPlan } from "./types"

const ex = (slug: string, sets: number, block: PlannedExercise["block"] = "main"): PlannedExercise => ({ slug, block, sets, reps: [8, 12], targetRir: 4, restS: 60 })
const session: SessionPlan = {
  id: "s",
  date: "2026-10-12",
  week: 1,
  dayType: "A",
  exercises: [ex("cat-stretch", 1, "warmup"), ex("dumbbell-squat", 3), { ...ex("dumbbell-pullover", 1), note: "Замена: нет турника" }],
  estMin: 20,
}

it("poor check-in eases main work: one set fewer (min 1), RIR +1, note appended; warm-up untouched; estMin recomputed", () => {
  const eased = autoregulate(session, { soreness: 4, sleep: 3, energy: 3 })
  expect(eased.exercises[0]).toEqual(session.exercises[0])
  expect(eased.exercises[1]).toMatchObject({ sets: 2, targetRir: 5, note: "Облегчено по самочувствию" })
  expect(eased.exercises[2]).toMatchObject({ sets: 1, targetRir: 5, note: "Замена: нет турника · Облегчено по самочувствию" })
  expect(eased.estMin).toBe(estimateMinutes(eased.exercises))
  expect(session.exercises[1].sets).toBe(3)
})

it("triggers on soreness ≥4, sleep ≤2 or energy ≤2; otherwise returns the session unchanged", () => {
  expect(autoregulate(session, { soreness: 2, sleep: 4, energy: 4 })).toEqual(session)
  expect(autoregulate(session, { soreness: 3, sleep: 3, energy: 3 })).toEqual(session)
  expect(autoregulate(session, { soreness: 1, sleep: 2, energy: 5 }).exercises[1].sets).toBe(2)
  expect(autoregulate(session, { soreness: 1, sleep: 5, energy: 2 }).exercises[1].sets).toBe(2)
})
