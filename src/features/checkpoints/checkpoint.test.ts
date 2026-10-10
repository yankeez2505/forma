import { expect, it } from "vitest"
import { clearedAnkle } from "@/features/program/engine/fixtures/owner"
import { META } from "@/features/program/engine/fixtures/rows"
import { emptyRows } from "@/lib/db"
import type { TestRow } from "@/lib/schema"
import { ankleStatus, latestTest } from "./checkpoint"

const baseResults = { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } }
const testRow = (id: string, date: string, kind: TestRow["kind"]): TestRow => ({ id, ...META, date, kind, results: baseResults })

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
it("latestTest picks the newest date, checkpoint over baseline on a tie", () => {
  const rows = emptyRows()
  expect(latestTest(rows)).toBeUndefined()
  rows.tests.a = testRow("a", "2026-10-12", "baseline")
  rows.tests.b = testRow("b", "2026-11-09", "checkpoint")
  rows.tests.c = testRow("c", "2026-11-09", "baseline")
  expect(latestTest(rows)?.id).toBe("b")
  delete rows.tests.b
  expect(latestTest(rows)?.id).toBe("c")
})
