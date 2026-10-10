import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { ownerBaseline, ownerProfile } from "./fixtures/owner"
import { buildPool } from "./pool"
import { deriveRestrictions } from "./restrictions"

const MAIN = ["squat", "hinge", "lunge", "push_h", "push_v", "pull_h", "core", "calf"] as const

it("home equipment: no bar exercises, every main pattern has candidates", () => {
  const pool = buildPool(exercises, ownerProfile, deriveRestrictions(ownerProfile, ownerBaseline))
  expect(pool.pull_v.map((e) => e.slug)).toEqual(["dumbbell-pullover"])
  for (const p of MAIN) expect(pool[p].length).toBeGreaterThan(0)
  expect(Object.values(pool).flat().some((e) => e.impact)).toBe(false)
  expect(pool.hinge.map((e) => e.difficultyRank)).toEqual([...pool.hinge.map((e) => e.difficultyRank)].sort((a, b) => a - b))
})

it("bodyweight-only profile still fills every main pattern", () => {
  const pool = buildPool(exercises, { ...ownerProfile, equipment: ["mat"] }, deriveRestrictions(ownerProfile, ownerBaseline))
  for (const p of ["squat", "hinge", "lunge", "push_h", "pull_h", "core", "calf"] as const) expect(pool[p].length).toBeGreaterThan(0)
  expect(pool.pull_v).toEqual([])
})

it("contraindications exclude", () => {
  const pool = buildPool(
    exercises,
    { ...ownerProfile, injuries: ["ankle", "lower_back"] },
    { noImpact: true, ankleRehab: true, exclude: ["ankle", "lower_back"] },
  )
  expect(pool.hinge.find((e) => e.slug === "dumbbell-rdl")).toBeUndefined()
})

it("experience none caps the level at 2; cleared ankle lets impact back in", () => {
  const novice = buildPool(exercises, { ...ownerProfile, experience: "none" }, deriveRestrictions(ownerProfile, ownerBaseline))
  expect(Object.values(novice).flat().some((e) => e.level > 2)).toBe(false)
  const cleared = buildPool(exercises, ownerProfile, { noImpact: false, ankleRehab: true, exclude: ["ankle"] })
  expect(cleared.cardio.map((e) => e.slug)).toContain("jump-rope")
})
