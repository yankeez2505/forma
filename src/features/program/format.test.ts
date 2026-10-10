import { expect, it } from "vitest"
import { dose, fmtDate, trainingDays } from "./format"

it("dose prints sets×reps or sets×seconds", () => {
  expect(dose({ slug: "x", block: "main", sets: 3, reps: [8, 12], targetRir: 4, restS: 60 })).toBe("3×8–12")
  expect(dose({ slug: "x", block: "main", sets: 2, reps: [10, 10], targetRir: 4, restS: 60 })).toBe("2×10")
  expect(dose({ slug: "x", block: "warmup", sets: 1, durationS: 30, targetRir: 5, restS: 0 })).toBe("1×30 с")
})

it("fmtDate is a short Russian date; trainingDays lists the weekdays", () => {
  expect(fmtDate("2026-10-12")).toMatch(/^пн, 12 окт/)
  expect(trainingDays(3)).toBe("Пн, Ср, Пт")
})
