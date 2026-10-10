import type { Exercise } from "@/content/types"
import { estimateMinutes } from "./engine/estimate"
import { lastPlanned, lastTwo } from "./engine/generateBlock"
import { buildPool } from "./engine/pool"
import { progressExercise } from "./engine/progression"
import { deriveRestrictions } from "./engine/restrictions"
import type { PlannedExercise, SessionLog, SessionPlan } from "./engine/types"
import type { StoredConfig } from "./model"

/**
 * in-block double progression for the main block of a planned session:
 * variant / reps / load / hold come from the last logs, sets and RIR stay the week's
 */
export function prepareSession(plan: SessionPlan, history: SessionLog[], cfg: StoredConfig, exercises: Exercise[]): SessionPlan {
  const recentDesc = [...history].sort((a, b) => b.date.localeCompare(a.date))
  const pool = buildPool(exercises, cfg.profile, deriveRestrictions(cfg.profile, cfg.latestTest))
  const bySlug = new Map(exercises.map((e) => [e.slug, e] as const))
  const next = plan.exercises.map((e): PlannedExercise => {
    const ex = bySlug.get(e.slug)
    if (e.block !== "main" || !ex) return e
    const list = pool[ex.pattern]
    if (!list.some((c) => c.slug === e.slug)) return e
    const prev = lastPlanned(recentDesc, e.slug) ?? e
    const progressed = progressExercise(prev, lastTwo(recentDesc, e.slug), list, ex)
    return { ...progressed, sets: e.sets, targetRir: e.targetRir }
  })
  return { ...plan, exercises: next, estMin: estimateMinutes(next) }
}
