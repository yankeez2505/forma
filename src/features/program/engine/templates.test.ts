import { expect, it } from "vitest"
import { dayTypeFor, getTemplate } from "./templates"

it("2–3 days alternate A/B, 4 days U/L", () => {
  expect([0, 1, 2, 3, 4, 5].map((i) => dayTypeFor(getTemplate(3), i))).toEqual(["A", "B", "A", "B", "A", "B"])
  expect([0, 1, 2, 3].map((i) => dayTypeFor(getTemplate(4), i))).toEqual(["U", "L", "U", "L"])
})

it("fullbody for 2–3 days, upper/lower for 4; vertical pull falls back to horizontal", () => {
  expect(getTemplate(2).kind).toBe("fullbody")
  expect(getTemplate(3)).toBe(getTemplate(2))
  expect(getTemplate(4).kind).toBe("upperlower")
  for (const tpl of [getTemplate(3), getTemplate(4)]) {
    const pullV = tpl.days.flatMap((d) => d.slots).filter((s) => s.pattern === "pull_v")
    expect(pullV).toHaveLength(1)
    expect(pullV[0].fallback).toBe("pull_h")
  }
})
