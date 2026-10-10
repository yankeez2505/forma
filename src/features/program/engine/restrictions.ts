import type { AnkleTest } from "@/lib/schema"
import type { ProfileInput, Restrictions, TestInput } from "./types"

/** all three must pass before impact (jumps, rope) unlocks */
export const ANKLE_CRITERIA = { kneeToWallDiffCm: 1, singleLegCalfRaises: 25, balanceEyesClosedS: 30 }

export function ankleCleared(t?: AnkleTest): boolean {
  return (
    t !== undefined &&
    t.knee_to_wall_diff_cm <= ANKLE_CRITERIA.kneeToWallDiffCm &&
    t.single_leg_calf_raises >= ANKLE_CRITERIA.singleLegCalfRaises &&
    t.balance_eyes_closed_s >= ANKLE_CRITERIA.balanceEyesClosedS
  )
}

/** derived, never stored: the latest test decides whether impact is unlocked */
export function deriveRestrictions(profile: ProfileInput, latestTest?: TestInput): Restrictions {
  const ankleRehab = profile.injuries.includes("ankle")
  return { noImpact: ankleRehab && !ankleCleared(latestTest?.ankle), ankleRehab, exclude: [...profile.injuries] }
}
