import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { META, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import type { StoredConfig } from "@/features/program/model"
import { historyFor } from "@/features/program/programService"
import { emptyRows } from "@/lib/db"
import { TABLES, type TestRow } from "@/lib/schema"
import { ageText, exportJson, programAffected, restartProgram } from "./profile"

const test: TestRow = { id: "t", ...META, date: "2026-10-12", kind: "baseline", results: { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } } }

it("programAffected ignores cosmetic fields and array order", () => {
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, height_cm: 181, figure: "female", activity_level: "high" })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, equipment: [...ownerProfileRow.equipment].reverse() })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, goal: "tone" })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, injuries: [] })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, days_per_week: 4 })).toBe(true)
})
it("restartProgram deactivates the old program and keeps its block index on a new id starting today", () => {
  const rows = programRows()
  rows.programs.p1 = { ...rows.programs.p1, config: { ...(rows.programs.p1.config as StoredConfig), blockIndex: 1 } }
  const profile = { ...ownerProfileRow, goal: "tone" as const, days_per_week: 4 as const }
  const out = restartProgram(rows.programs.p1, profile, test, "2026-10-19", exercises, historyFor(rows), "p2")   // Monday → full first week
  expect(out.deactivate).toMatchObject({ id: "p1", active: false })
  expect(out.program.program).toMatchObject({ id: "p2", start_date: "2026-10-19", goal: "tone", template: "upperlower", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 1, blockStart: "2026-10-19", seed: "p2", latestTest: { ...test.results, date: "2026-10-12" }, profile: { goal: "tone", days_per_week: 4 } })
  expect(out.program.sessions).toHaveLength(16)
  expect(out.program.sessions[0].date).toBe("2026-10-19")
  expect(out.program.sessions.every((s) => s.program_id === "p2")).toBe(true)
})
it("restartProgram without an old program starts block 0 and deactivates nothing", () => {
  const out = restartProgram(undefined, ownerProfileRow, test, "2026-10-12", exercises, [], "p3")
  expect(out.deactivate).toBeUndefined()
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 0, blockStart: "2026-10-12" })
  expect(out.program.sessions).toHaveLength(12)
})
it("exportJson round-trips every table", () => {
  const rows = programRows()
  const parsed = JSON.parse(exportJson(rows, "local", "2026-10-12T10:00:00.000Z")) as { app: string; version: number; exportedAt: string; userId: string; tables: Record<string, unknown> }
  expect(parsed).toMatchObject({ app: "forma", version: 1, exportedAt: "2026-10-12T10:00:00.000Z", userId: "local" })
  expect(Object.keys(parsed.tables)).toEqual([...TABLES])
  expect(parsed.tables).toEqual(JSON.parse(JSON.stringify(rows)))
  expect(JSON.parse(exportJson(emptyRows(), "local", "x")).tables.workouts).toEqual({})
})
it("ageText declines «год» by Russian rules", () => {
  expect([1, 2, 5, 11, 12, 21, 22, 25, 101, 111].map(ageText)).toEqual(["1 год", "2 года", "5 лет", "11 лет", "12 лет", "21 год", "22 года", "25 лет", "101 год", "111 лет"])
})
