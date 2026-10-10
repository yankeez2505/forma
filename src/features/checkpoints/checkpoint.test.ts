import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { clearedAnkle } from "@/features/program/engine/fixtures/owner"
import { finishSession, META, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { testId, type StoredConfig } from "@/features/program/model"
import { plannedSessions } from "@/features/program/programService"
import { emptyRows, type Rows } from "@/lib/db"
import type { TestRow } from "@/lib/schema"
import { ankleStatus, checkpointRows, latestTest, remainingSessions } from "./checkpoint"

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
it("checkpointRows writes a checkpoint test and the next block of the active program", () => {
  const rows = programRows()
  rows.tests.t0 = testRow("t0", "2026-10-12", "baseline")
  const sessions = plannedSessions(rows, "p1")
  for (const s of sessions.slice(0, 11)) finishSession(rows, s.id, `${s.date}T18:00:00.000Z`, [])
  expect(remainingSessions(rows)).toBe(1)
  const results = { pushups: 18, squats: 32, plank_s: 60, ankle: clearedAnkle }
  const out = checkpointRows(rows, results, "local", "2026-11-09", exercises)
  expect(out.test).toEqual({ id: testId("local", "2026-11-09", "checkpoint"), date: "2026-11-09", kind: "checkpoint", results })
  expect(out.program.program).toMatchObject({ id: "p1", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 1, blockStart: "2026-11-09", latestTest: { ...results, date: "2026-11-09" } })
  expect(out.program.sessions[0].date).toBe("2026-11-09")
  rows.tests[out.test.id] = { ...out.test, ...META } as Rows["tests"][string]
  rows.programs.p1 = { ...out.program.program, ...META } as Rows["programs"][string]
  for (const s of out.program.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  expect(plannedSessions(rows, "p1").every((s) => s.date >= "2026-11-09")).toBe(true)
  expect(latestTest(rows)?.kind).toBe("checkpoint")
  expect(remainingSessions(rows)).toBe(12)
})
it("checkpointRows without an active program builds block 0 from the profile; without a profile it throws", () => {
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  expect(remainingSessions(rows)).toBe(0)
  const out = checkpointRows(rows, baseResults, "local", "2026-10-12", exercises)
  expect(out.test.kind).toBe("baseline")
  expect(out.program.program).toMatchObject({ start_date: "2026-10-12", goal: "fat", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 0, blockStart: "2026-10-12", profile: { goal: "fat", days_per_week: 3 } })
  expect(out.program.sessions).toHaveLength(12)
  expect(out.program.sessions.every((s) => (s.exercises as { block: string }[]).every((e) => e.block !== "finisher"))).toBe(true)
  expect(() => checkpointRows(emptyRows(), baseResults, "local", "2026-10-12", exercises)).toThrow("no profile")
})
