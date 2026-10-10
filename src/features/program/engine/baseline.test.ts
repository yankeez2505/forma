import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { pickExercise, startDuration, startRank, startReps } from "./baseline"
import { ownerBaseline } from "./fixtures/owner"
import type { TestInput } from "./types"

const t = (patch: Partial<TestInput>): TestInput => ({ ...ownerBaseline, ...patch })

it("startRank follows the test thresholds; untested patterns start at 1", () => {
  expect([3, 5, 14, 15].map((pushups) => startRank("push_h", t({ pushups })))).toEqual([1, 2, 2, 3])
  expect([14, 15, 29, 30].map((squats) => startRank("squat", t({ squats })))).toEqual([1, 2, 2, 3])
  expect([19, 20, 59, 60].map((plank_s) => startRank("core", t({ plank_s })))).toEqual([1, 4, 4, 6])
  expect(startRank("hinge", ownerBaseline)).toBe(1)
})

it("startReps: under 5 push-ups starts at 5-8, otherwise 8-12", () => {
  expect(startReps("push_h", t({ pushups: 4 }))).toEqual([5, 8])
  expect(startReps("push_h", ownerBaseline)).toEqual([8, 12])
  expect(startReps("squat", t({ squats: 3 }))).toEqual([8, 12])
})

it("startDuration: plank is 60% of the test in 5 s steps within 15-60 s, other holds 30 s", () => {
  expect(startDuration(ownerBaseline, "plank")).toBe(25)
  expect(startDuration(t({ plank_s: 10 }), "plank")).toBe(15)
  expect(startDuration(t({ plank_s: 180 }), "plank")).toBe(60)
  expect(startDuration(ownerBaseline, "side-plank")).toBe(30)
})

it("pickExercise chooses among the first two at or above minRank, else the hardest available", () => {
  const squats = exercises.filter((e) => e.pattern === "squat" && !e.impact).sort((a, b) => a.difficultyRank - b.difficultyRank)
  expect(pickExercise(squats, 2, () => 0)?.slug).toBe("band-squat")
  expect(pickExercise(squats, 2, () => 0.99)?.slug).toBe("dumbbell-squat")
  expect(pickExercise(squats, 9, () => 0)?.slug).toBe("plie-dumbbell-squat")
  expect(pickExercise([], 1, () => 0)).toBeUndefined()
})
