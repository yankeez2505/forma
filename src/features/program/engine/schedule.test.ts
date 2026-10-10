import { expect, it } from "vitest"
import { sessionDates } from "./schedule"

it("saturday start, 3 days → first Monday, 12 sessions", () => {
  const d = sessionDates("2026-10-10", 3)
  expect(d[0]).toEqual({ date: "2026-10-12", week: 1 })
  expect(d).toHaveLength(12)
  expect(d.at(-1)!.date).toBe("2026-11-06")
  expect(d.map((s) => s.week)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4])
})

it("tuesday start keeps current week", () => {
  const d = sessionDates("2026-10-13", 3)
  expect(d[0].date).toBe("2026-10-14")
  expect(d).toHaveLength(11)
})

it("2 days are Mon/Thu, 4 days are Mon/Tue/Thu/Fri", () => {
  expect(sessionDates("2026-10-12", 2, 1).map((s) => s.date)).toEqual(["2026-10-12", "2026-10-15"])
  expect(sessionDates("2026-10-12", 4, 1).map((s) => s.date)).toEqual(["2026-10-12", "2026-10-13", "2026-10-15", "2026-10-16"])
})
