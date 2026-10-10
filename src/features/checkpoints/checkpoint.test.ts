import { expect, it } from "vitest"
import { clearedAnkle } from "@/features/program/engine/fixtures/owner"
import { ankleStatus } from "./checkpoint"

it("ankleStatus lists the three criteria in order and clears only when all pass", () => {
  const none = ankleStatus(undefined)
  expect(none.cleared).toBe(false)
  expect(none.criteria.map((c) => c.key)).toEqual(["knee_to_wall_diff_cm", "single_leg_calf_raises", "balance_eyes_closed_s"])
  expect(none.criteria.map((c) => `${c.op}${c.target}`)).toEqual(["≤1", "≥25", "≥30"])
  expect(none.criteria.every((c) => !c.ok && c.value === undefined)).toBe(true)
  const partial = ankleStatus({ knee_to_wall_diff_cm: 1, single_leg_calf_raises: 25, balance_eyes_closed_s: 29 })
  expect(partial.criteria.map((c) => c.ok)).toEqual([true, true, false])
  expect(partial.cleared).toBe(false)
  expect(ankleStatus(clearedAnkle).cleared).toBe(true)
})
