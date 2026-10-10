import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { ownerBaseline, ownerProfile } from "./fixtures/owner"
import { buildPool } from "./pool"
import { deriveRestrictions } from "./restrictions"
import type { ProfileInput } from "./types"
import { buildWarmup } from "./warmup"

const poolFor = (profile: ProfileInput) => {
  const r = deriveRestrictions(profile, ownerBaseline)
  return { r, pool: buildPool(exercises, profile, r) }
}
const slugs = (list: { slug: string }[]) => list.map((e) => e.slug)

it("ankle rehab prepends the ankle block; A/L days add a squat; every entry is one easy warm-up set", () => {
  const { r, pool } = poolFor(ownerProfile)
  const a = buildWarmup(r, "A", pool)
  expect(slugs(a)).toEqual(["ankle-circles", "calf-stretch-wall", "standing-calf-raise", "cat-stretch", "standing-hip-circles", "worlds-greatest-stretch", "bodyweight-squat"])
  for (const e of a) expect(e).toMatchObject({ block: "warmup", sets: 1, restS: 0, targetRir: 5 })
  expect(a[0].durationS).toBe(30)
  expect(a[2].reps).toEqual([12, 12])
  expect(slugs(buildWarmup(r, "L", pool)).at(-1)).toBe("bodyweight-squat")
})

it("B/U days finish with band pull-aparts, or a dynamic chest stretch without a band", () => {
  const { r, pool } = poolFor(ownerProfile)
  expect(slugs(buildWarmup(r, "B", pool)).at(-1)).toBe("band-pull-apart")
  const noBand = poolFor({ ...ownerProfile, equipment: ["mat", "chair", "wall"] })
  expect(slugs(buildWarmup(noBand.r, "U", noBand.pool)).at(-1)).toBe("dynamic-chest-stretch")
})

it("no ankle injury → no ankle block; exercises missing from the pool are skipped", () => {
  const healthy = poolFor({ ...ownerProfile, injuries: [] })
  expect(slugs(buildWarmup(healthy.r, "A", healthy.pool))).toEqual(["cat-stretch", "standing-hip-circles", "worlds-greatest-stretch", "bodyweight-squat"])
  const noMat = poolFor({ ...ownerProfile, injuries: [], equipment: ["band"] })
  expect(slugs(buildWarmup(noMat.r, "A", noMat.pool))).not.toContain("cat-stretch")
})
