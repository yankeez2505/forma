import { expect, it } from "vitest"
import { all as exercises, bySlug } from "@/features/exercises/useExercises"
import { clearedAnkle, ownerBaseline, ownerProfile } from "./fixtures/owner"
import { applyGoal } from "./goals"
import { buildPool } from "./pool"
import { deriveRestrictions } from "./restrictions"
import type { PlannedExercise } from "./types"

const r = deriveRestrictions(ownerProfile, ownerBaseline)
const pool = buildPool(exercises, ownerProfile, r)
const ex = (slug: string, targetRir = 3): PlannedExercise => ({ slug, block: "main", sets: 3, reps: [8, 12], targetRir, restS: 60 })
const main = [ex("dumbbell-squat"), ex("push-up")]
const rng = () => 0

it("fat: no finisher in the first block; from block 1 a 4-minute cardio finisher without impact", () => {
  expect(applyGoal("fat", main, r, pool, 0, rng)).toEqual(main)
  const out = applyGoal("fat", main, r, pool, 1, rng)
  expect(out.slice(0, 2)).toEqual(main)
  expect(out[2]).toMatchObject({ slug: "fast-step-up", block: "finisher", sets: 1, durationS: 240 })
  const cleared = deriveRestrictions(ownerProfile, { ...ownerBaseline, ankle: clearedAnkle })
  const fin = applyGoal("fat", main, cleared, buildPool(exercises, ownerProfile, cleared), 1, () => 0.99).at(-1)!
  expect(fin.block).toBe("finisher")
  expect(bySlug.get(fin.slug)!.pattern).toBe("cardio")
})

it("muscle: from block 1 adds two sets of arms and works one RIR closer to failure, never below RIR 1", () => {
  expect(applyGoal("muscle", main, r, pool, 0, rng)).toEqual(main)
  const out = applyGoal("muscle", [ex("dumbbell-squat", 3), ex("push-up", 1)], r, pool, 1, rng)
  expect(out.slice(0, 2).map((e) => e.targetRir)).toEqual([2, 1])
  expect(out[2]).toMatchObject({ block: "main", sets: 2, targetRir: 2 })
  expect(bySlug.get(out[2].slug)!.pattern).toBe("arms")
})

it("tone: ends with a 45 s mobility cool-down", () => {
  const out = applyGoal("tone", main, r, pool, 0, rng)
  expect(out.slice(0, 2)).toEqual(main)
  expect(out[2]).toMatchObject({ block: "cooldown", sets: 1, durationS: 45, restS: 0 })
  expect(bySlug.get(out[2].slug)!.pattern).toBe("mobility")
})
