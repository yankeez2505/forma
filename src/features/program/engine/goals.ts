import type { Exercise } from "@/content/types"
import type { Goal } from "@/lib/schema"
import { DUMBBELL_KG, type PlannedExercise, type Pool, type Restrictions } from "./types"

const FINISHER_S = 240
const COOLDOWN_S = 45
const ARMS_SETS = 2

const pick = (list: Exercise[], rng: () => number): Exercise | undefined => list[Math.floor(rng() * list.length)]

/** goal-specific additions on top of the shared main block (exs holds main exercises only) */
export function applyGoal(goal: Goal, exs: PlannedExercise[], r: Restrictions, pool: Pool, blockIndex: number, rng: () => number): PlannedExercise[] {
  switch (goal) {
    case "fat": {
      if (blockIndex === 0) return exs
      const cardio = pick(pool.cardio.filter((e) => !(r.noImpact && e.impact)), rng)
      if (!cardio) return exs
      return [...exs, { slug: cardio.slug, block: "finisher", sets: 1, durationS: FINISHER_S, targetRir: 3, restS: 0 }]
    }
    case "muscle": {
      if (blockIndex === 0) return exs
      const closer = exs.map((e) => (e.block === "main" ? { ...e, targetRir: Math.max(1, e.targetRir - 1) } : e))
      const arms = pick(pool.arms, rng)
      if (!arms) return closer
      const rir = closer.find((e) => e.block === "main")?.targetRir ?? 2
      const extra: PlannedExercise = { slug: arms.slug, block: "main", sets: ARMS_SETS, reps: [8, 12], targetRir: rir, restS: 60 }
      if (arms.equipment.includes("dumbbell")) extra.loadKg = DUMBBELL_KG
      return [...closer, extra]
    }
    case "tone": {
      const mobility = pick(pool.mobility, rng)
      if (!mobility) return exs
      return [...exs, { slug: mobility.slug, block: "cooldown", sets: 1, durationS: COOLDOWN_S, targetRir: 5, restS: 0 }]
    }
  }
}
