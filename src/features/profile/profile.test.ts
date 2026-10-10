import { expect, it } from "vitest"
import { ownerProfileRow } from "@/features/program/engine/fixtures/rows"
import { programAffected } from "./profile"

it("programAffected ignores cosmetic fields and array order", () => {
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, height_cm: 181, figure: "female", activity_level: "high" })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, equipment: [...ownerProfileRow.equipment].reverse() })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, goal: "tone" })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, injuries: [] })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, days_per_week: 4 })).toBe(true)
})
