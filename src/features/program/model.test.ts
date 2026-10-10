import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { generateBlock } from "./engine"
import { ownerConfig } from "./engine/fixtures/owner"
import { isoDate, metricId, setId, targetId, testId, toPlannedRow, toSessionPlan } from "./model"

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
