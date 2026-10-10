import { expect, it } from "vitest"
import { all as exercises, bySlug } from "@/features/exercises/useExercises"
import { ownerConfig } from "./engine/fixtures/owner"
import { generateBlock } from "./engine/generateBlock"
import type { StoredConfig } from "./model"
import { prepareSession } from "./prepare"

const plan = generateBlock(ownerConfig, exercises, [], 0, "p")[0]
const squat = plan.exercises.find((e) => e.block === "main" && bySlug.get(e.slug)!.pattern === "squat")!
const top = (date: string) => ({ date, sets: [1, 2, 3].map((n) => ({ slug: squat.slug, setNo: n, reps: 12, weightKg: 10 })) })
const cfg: StoredConfig = { ...ownerConfig, blockIndex: 0, blockStart: "2026-10-12" }

it("prepareSession advances a main exercise that hit the top of its range twice", () => {
  const ready = prepareSession(plan, [top("2026-10-12"), top("2026-10-14")], cfg, exercises)
  const next = ready.exercises.find((e) => e.block === "main" && bySlug.get(e.slug)!.pattern === "squat")!
  expect(next.slug).not.toBe(squat.slug)
  expect(ready.estMin).toBeGreaterThan(0)
})

it("prepareSession without history returns the plan unchanged", () => {
  expect(prepareSession(plan, [], cfg, exercises)).toEqual(plan)
})
