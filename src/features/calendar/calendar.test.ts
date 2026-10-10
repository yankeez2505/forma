import { expect, it } from "vitest"

import { monthGrid } from "./calendar"

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
