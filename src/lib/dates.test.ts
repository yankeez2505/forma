import { describe, expect, it } from "vitest"
import { addDays, diffDays, startOfWeek, toISODate, todayISO, weekday } from "./dates"

describe("dates", () => {
  it("toISODate uses local date, not UTC", () => {
    expect(toISODate(new Date(2026, 9, 10, 23, 30))).toBe("2026-10-10")
  })
  it("todayISO formats the given moment", () => {
    expect(todayISO(new Date(2026, 0, 5, 1))).toBe("2026-01-05")
  })
  it("addDays crosses month", () => expect(addDays("2026-10-30", 3)).toBe("2026-11-02"))
  it("addDays goes backwards across year", () => expect(addDays("2026-01-01", -1)).toBe("2025-12-31"))
  it("startOfWeek returns Monday", () => {
    expect(startOfWeek("2026-10-10")).toBe("2026-10-05") // суббота → понедельник
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05")
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05") // воскресенье
  })
  it("weekday: Monday is 0, Sunday is 6", () => {
    expect(weekday("2026-10-05")).toBe(0)
    expect(weekday("2026-10-11")).toBe(6)
  })
  it("diffDays", () => expect(diffDays("2026-10-01", "2026-10-10")).toBe(9))
})
