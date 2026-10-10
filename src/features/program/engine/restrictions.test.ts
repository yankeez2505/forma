import { expect, it } from "vitest"
import { clearedAnkle, ownerBaseline, ownerProfile } from "./fixtures/owner"
import { ankleCleared, deriveRestrictions } from "./restrictions"

it("ankle not cleared → noImpact", () => {
  expect(deriveRestrictions(ownerProfile, ownerBaseline)).toEqual({ noImpact: true, ankleRehab: true, exclude: ["ankle"] })
})

it("3/3 criteria → cleared; 2/3 → not", () => {
  expect(ankleCleared(clearedAnkle)).toBe(true)
  expect(ankleCleared({ ...clearedAnkle, single_leg_calf_raises: 24 })).toBe(false)
  expect(ankleCleared({ ...clearedAnkle, knee_to_wall_diff_cm: 1.5 })).toBe(false)
  expect(ankleCleared({ ...clearedAnkle, balance_eyes_closed_s: 29 })).toBe(false)
  expect(ankleCleared(undefined)).toBe(false)
  expect(deriveRestrictions(ownerProfile, { ...ownerBaseline, ankle: clearedAnkle })).toEqual({
    noImpact: false,
    ankleRehab: true,
    exclude: ["ankle"],
  })
})

it("no test yet → impact locked only if ankle injury", () => {
  expect(deriveRestrictions(ownerProfile).noImpact).toBe(true)
  expect(deriveRestrictions({ ...ownerProfile, injuries: [] })).toEqual({ noImpact: false, ankleRehab: false, exclude: [] })
})
