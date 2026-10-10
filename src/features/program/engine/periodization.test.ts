import { expect, it } from "vitest"
import { capSets, setCap, totalMainSets, weekParams } from "./periodization"
import type { PlannedExercise, SessionPlan } from "./types"

const weeks: SessionPlan["week"][] = [1, 2, 3, 4]

it("weekParams: block 0 keeps RIR 4-5 for two weeks then RIR 3; later blocks RIR 3 then 2-3; week 4 deloads to 60%", () => {
  expect(weeks.map((w) => weekParams(w, 0))).toEqual([
    { rir: [4, 5], setScale: 1 },
    { rir: [4, 5], setScale: 1 },
    { rir: [3, 3], setScale: 1 },
    { rir: [4, 5], setScale: 0.6 },
  ])
  expect(weeks.map((w) => weekParams(w, 1))).toEqual([
    { rir: [3, 3], setScale: 1 },
    { rir: [2, 3], setScale: 1 },
    { rir: [2, 3], setScale: 1 },
    { rir: [4, 5], setScale: 0.6 },
  ])
})

it("setCap: 8 in the first block, then 12 (14 for muscle)", () => {
  expect(setCap(0, "muscle")).toBe(8)
  expect(setCap(1, "fat")).toBe(12)
  expect(setCap(2, "muscle")).toBe(14)
})

it("capSets trims from the end round-robin, keeps at least 1 set, leaves warm-up alone, does not mutate", () => {
  const ex = (slug: string, sets: number, block: PlannedExercise["block"] = "main"): PlannedExercise => ({ slug, block, sets, targetRir: 4, restS: 60 })
  const day = [ex("w", 1, "warmup"), ex("a", 3), ex("b", 3), ex("c", 3), ex("d", 2)]
  expect(totalMainSets(day)).toBe(11)
  expect(capSets(day, 8).map((e) => e.sets)).toEqual([1, 3, 2, 2, 1])
  expect(capSets(day, 2).map((e) => e.sets)).toEqual([1, 1, 1, 1, 1])
  expect(capSets(day, 20)).toEqual(day)
  expect(day.map((e) => e.sets)).toEqual([1, 3, 3, 3, 2])
})
