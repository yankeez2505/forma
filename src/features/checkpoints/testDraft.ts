import type { TestRow } from "@/lib/schema"

/** fields of the physical test as typed in a form; shared by onboarding and the checkpoint */
export interface TestDraft {
  pushups?: number
  squats?: number
  plank_s?: number
  knee_to_wall_diff_cm?: number
  single_leg_calf_raises?: number
  balance_eyes_closed_s?: number
}

const filled = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n)

/** null until every required field is filled (0 counts); with `withAnkle` the three ankle fields are required too */
export function completeTest(v: TestDraft, withAnkle: boolean): TestRow["results"] | null {
  if (!filled(v.pushups) || !filled(v.squats) || !filled(v.plank_s)) return null
  const base = { pushups: v.pushups, squats: v.squats, plank_s: v.plank_s }
  if (!withAnkle) return base
  if (!filled(v.knee_to_wall_diff_cm) || !filled(v.single_leg_calf_raises) || !filled(v.balance_eyes_closed_s)) return null
  return {
    ...base,
    ankle: { knee_to_wall_diff_cm: v.knee_to_wall_diff_cm, single_leg_calf_raises: v.single_leg_calf_raises, balance_eyes_closed_s: v.balance_eyes_closed_s },
  }
}
