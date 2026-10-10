import { expect, it } from "vitest"

import { finishSession, programRows } from "@/features/program/engine/fixtures/rows"
import { plannedSessions } from "@/features/program/programService"
import { dayStatus, daySessions, monthGrid, weekProgress, weekStreak } from "./calendar"

it("monthGrid covers a month in Monday-based weeks", () => {
  const g = monthGrid("2026-10-01") // Thursday start → 5 rows
  expect(g).toHaveLength(5)
  expect(g.every((w) => w.length === 7)).toBe(true)
  expect(g[0][0]).toBe("2026-09-28")
  expect(g[4][6]).toBe("2026-11-01")
  expect(g.flat()).toContain("2026-10-31")
  const feb = monthGrid("2026-02-01") // Sunday start → 5 rows
  expect(feb[0][0]).toBe("2026-01-26")
  expect(feb[4][6]).toBe("2026-03-01")
  expect(monthGrid("2027-02-01")).toHaveLength(4) // Monday start, 28 days → exactly 4 rows
})

it("dayStatus: done, planned, missed, rest; a workout counts for the day it started", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  expect(dayStatus(rows, "2026-10-12", "2026-10-12")).toBe("planned")
  expect(dayStatus(rows, "2026-10-12", "2026-10-13")).toBe("missed")
  expect(dayStatus(rows, "2026-10-13", "2026-10-13")).toBe("rest")
  finishSession(rows, s[0].id, new Date(2026, 9, 12, 23, 40).toISOString(), []) // started before midnight local time
  expect(dayStatus(rows, "2026-10-12", "2026-10-13")).toBe("done")
  expect(daySessions(rows, "2026-10-12").workouts.map((w) => w.id)).toEqual([`w-${s[0].id}`])
  expect(daySessions(rows, "2026-10-12").planned?.id).toBe(s[0].id)
  finishSession(rows, s[1].id, new Date(2026, 9, 15, 9, 0).toISOString(), []) // Wednesday's session done on Thursday
  expect(dayStatus(rows, "2026-10-14", "2026-10-20")).toBe("done")
  expect(dayStatus(rows, "2026-10-15", "2026-10-20")).toBe("done")
})

it("weekProgress and weekStreak", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  expect(weekProgress(rows, "2026-10-12")).toEqual({ done: 0, total: 3 })
  expect(weekStreak(rows, "2026-10-13")).toBe(0)
  for (const x of s.slice(0, 3)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(weekProgress(rows, "2026-10-12")).toEqual({ done: 3, total: 3 })
  expect(weekStreak(rows, "2026-10-16")).toBe(1) // current week complete
  expect(weekStreak(rows, "2026-10-20")).toBe(1) // previous week complete, current not yet
  for (const x of s.slice(3, 6)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(weekStreak(rows, "2026-10-27")).toBe(2)
  expect(weekStreak(rows, "2026-10-11")).toBe(0) // the week before the program has no sessions
})
