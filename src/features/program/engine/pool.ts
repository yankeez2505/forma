import type { Exercise, Pattern } from "@/content/types"
import type { EquipmentTag, Experience } from "@/lib/schema"
import type { Pool, ProfileInput, Restrictions } from "./types"

export const PATTERNS = [
  "squat",
  "hinge",
  "lunge",
  "push_h",
  "push_v",
  "pull_h",
  "pull_v",
  "core",
  "calf",
  "mobility",
  "cardio",
  "arms",
  "shoulder_iso",
] as const satisfies readonly Pattern[]

/** every home has these */
export const ALWAYS_AVAILABLE: EquipmentTag[] = ["chair", "wall"]
/** highest exercise level by experience */
export const LEVEL_CAP: Record<Experience, 1 | 2 | 3> = { none: 2, some: 3, regular: 3 }

/** candidates per pattern: owned equipment ∩ level cap ∩ no contraindication ∩ (no impact while locked), easiest first */
export function buildPool(exercises: Exercise[], profile: ProfileInput, r: Restrictions): Pool {
  const owned = new Set<EquipmentTag>([...profile.equipment, ...ALWAYS_AVAILABLE])
  const cap = LEVEL_CAP[profile.experience]
  const pool = Object.fromEntries(PATTERNS.map((p) => [p, [] as Exercise[]])) as Pool
  for (const e of exercises) {
    if (e.level > cap) continue
    if (r.noImpact && e.impact) continue
    if (!e.equipment.every((t) => owned.has(t))) continue
    if (e.contraindications.some((t) => r.exclude.includes(t))) continue
    pool[e.pattern].push(e)
  }
  for (const list of Object.values(pool)) list.sort((a, b) => a.difficultyRank - b.difficultyRank)
  return pool
}
