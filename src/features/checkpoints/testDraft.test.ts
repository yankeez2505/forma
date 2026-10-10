import { expect, it } from "vitest"
import { completeTest } from "./testDraft"

it("completeTest needs the three base fields, zero counts as filled", () => {
  expect(completeTest({ pushups: 0, squats: 10 }, false)).toBeNull()
  expect(completeTest({ pushups: 0, squats: 10, plank_s: 20 }, false)).toEqual({ pushups: 0, squats: 10, plank_s: 20 })
})

it("completeTest with ankle requires all three ankle fields and nests them", () => {
  const base = { pushups: 12, squats: 25, plank_s: 40, knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12 }
  expect(completeTest(base, true)).toBeNull()
  expect(completeTest({ ...base, balance_eyes_closed_s: 15 }, true)).toEqual({ pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } })
  expect(completeTest({ ...base, balance_eyes_closed_s: 15 }, false)).toEqual({ pushups: 12, squats: 25, plank_s: 40 })
})
