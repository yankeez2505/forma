import { expect, it } from "vitest"
import { ACTIVITY_RU, EXPERIENCE_RU, GOAL_RU, INJURY_RU } from "@/content/labels"
import { all as exercises } from "@/features/exercises/useExercises"
import { generateBlock } from "./engine"
import { ownerBaseline, ownerConfig, ownerProfile } from "./engine/fixtures/owner"
import { isoDate, metricId, newConfig, setId, targetId, testId, toPlannedRow, toSessionPlan } from "./model"

it("ids are deterministic uuids", () => {
  expect(metricId("u", "2026-10-10")).toBe(metricId("u", "2026-10-10"))
  expect(metricId("u", "2026-10-10")).not.toBe(targetId("u", "2026-10-10"))
  expect(setId("w", "push-up", 1)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(testId("u", "2026-10-10", "baseline")).not.toBe(testId("u", "2026-10-10", "checkpoint"))
})
it("planned row round-trips to a session plan", () => {
  const s = generateBlock(ownerConfig, exercises, [], 0, "p")[0]
  const row = toPlannedRow(s, "p")
  expect(row).toMatchObject({ id: s.id, program_id: "p", date: s.date, week: 1, day_type: "A", est_min: s.estMin })
  expect(toSessionPlan({ ...row, user_id: "u", created_at: "", updated_at: "" })).toEqual(s)
})
it("isoDate takes the local calendar day of a timestamp", () => {
  const d = new Date(2026, 10, 2, 23, 30)
  expect(isoDate(d.toISOString())).toBe("2026-11-02")
})

it("labels cover every enum value", () => {
  expect(Object.keys(GOAL_RU).sort()).toEqual(["fat", "muscle", "tone"])
  expect(Object.keys(EXPERIENCE_RU).sort()).toEqual(["none", "regular", "some"])
  expect(Object.keys(ACTIVITY_RU).sort()).toEqual(["high", "light", "moderate", "sedentary"])
  expect(Object.keys(INJURY_RU).sort()).toEqual(["ankle", "knee", "lower_back", "shoulder", "wrist"])
})

it("newConfig starts block 0 at startDate with the baseline as latest test", () => {
  const cfg = newConfig(ownerProfile, ownerBaseline, "2026-10-12", "s")
  expect(cfg).toEqual({ profile: ownerProfile, baseline: ownerBaseline, latestTest: ownerBaseline, startDate: "2026-10-12", seed: "s", generatorVersion: 1, blockIndex: 0, blockStart: "2026-10-12" })
})
