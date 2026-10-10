import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import type { Rows } from "@/lib/db"
import { clearedAnkle, ownerBaseline } from "./engine/fixtures/owner"
import { META, finishSession, ownerStored, programRows } from "./engine/fixtures/rows"
import type { StoredConfig } from "./model"
import { activeProgram, blockComplete, buildProgram, finishedByPlanned, historyFor, nextBlock, nextSession, plannedSessions } from "./programService"

it("buildProgram returns the program row and one planned row per session", () => {
  const { program, sessions } = buildProgram(ownerStored, exercises, [], "p1")
  expect(program).toEqual({ id: "p1", start_date: "2026-10-10", goal: "fat", template: "fullbody", active: true, config: ownerStored })
  expect(sessions).toHaveLength(12)
  expect(sessions[0]).toMatchObject({ program_id: "p1", date: "2026-10-12", week: 1, day_type: "A" })
})

it("selectors find the active program, its sessions, the next session and block completion", () => {
  const rows = programRows()
  expect(activeProgram(rows)?.id).toBe("p1")
  const sessions = plannedSessions(rows, "p1")
  expect(sessions.slice(0, 3).map((s) => s.date)).toEqual(["2026-10-12", "2026-10-14", "2026-10-16"])
  expect(nextSession(rows, "2026-10-13")?.date).toBe("2026-10-14")
  finishSession(rows, sessions[1].id, "2026-10-14T18:00:00.000Z", [])
  expect(nextSession(rows, "2026-10-14")?.date).toBe("2026-10-16")
  expect(blockComplete(rows, "2026-11-06")).toBe(false)
  expect(blockComplete(rows, "2026-11-07")).toBe(true)
  expect(finishedByPlanned(rows).has(sessions[1].id)).toBe(true)
})

it("historyFor returns finished workouts as session logs sorted by date", () => {
  const rows = programRows()
  const [a, b, c] = plannedSessions(rows, "p1")
  finishSession(rows, b.id, "2026-10-14T18:00:00.000Z", [{ slug: "push-up", reps: 10 }])
  finishSession(rows, a.id, "2026-10-12T18:00:00.000Z", [{ slug: "push-up", reps: 9 }, { slug: "push-up", reps: 8 }])
  finishSession(rows, c.id, "2026-10-16T18:00:00.000Z", [])
  rows.workouts[`w-${c.id}`].finished_at = null
  const h = historyFor(rows)
  expect(h.map((s) => s.date)).toEqual(["2026-10-12", "2026-10-14"])
  expect(h[0]).toMatchObject({ dayType: "A", preSoreness: 2, rpe: 6, sets: [{ slug: "push-up", setNo: 1, reps: 9, rir: 4 }, { slug: "push-up", setNo: 2, reps: 8, rir: 4 }] })
  expect(h[0].planned).toEqual(a.exercises)
})

it("nextBlock keeps the program id and start date, bumps the block and replaces the sessions", () => {
  const rows = programRows()
  const next = nextBlock(rows.programs.p1, { ...ownerBaseline, date: "2026-11-09", ankle: clearedAnkle }, "2026-11-09", exercises, historyFor(rows))
  expect(next.program).toMatchObject({ id: "p1", start_date: "2026-10-10", active: true })
  expect(next.program.config as StoredConfig).toMatchObject({ blockIndex: 1, blockStart: "2026-11-09" })
  expect(next.sessions[0].date).toBe("2026-11-09")
  expect(next.sessions.some((s) => (s.exercises as { block: string }[]).some((e) => e.block === "finisher"))).toBe(true)
  rows.programs.p1 = { ...next.program, ...META } as Rows["programs"][string]
  for (const s of next.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  const current = plannedSessions(rows, "p1")
  expect(current).toHaveLength(12)
  expect(current.every((s) => s.date >= "2026-11-09")).toBe(true)
})
