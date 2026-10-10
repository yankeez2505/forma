import type { DayType, PlannedExercise, Pool, Restrictions } from "./types"

interface WarmupItem {
  slug: string
  durationS?: number
  reps?: number
}

const ANKLE: WarmupItem[] = [
  { slug: "ankle-circles", durationS: 30 },
  { slug: "calf-stretch-wall", durationS: 30 },
  { slug: "standing-calf-raise", reps: 12 },
]
const BASE: WarmupItem[] = [
  { slug: "cat-stretch", durationS: 30 },
  { slug: "standing-hip-circles", durationS: 30 },
  { slug: "worlds-greatest-stretch", reps: 6 },
]
const LOWER: WarmupItem[] = [{ slug: "bodyweight-squat", reps: 10 }]
/** first available wins */
const UPPER: WarmupItem[] = [{ slug: "band-pull-apart", reps: 12 }, { slug: "dynamic-chest-stretch", durationS: 30 }]

const toPlanned = (i: WarmupItem): PlannedExercise => {
  const p: PlannedExercise = { slug: i.slug, block: "warmup", sets: 1, targetRir: 5, restS: 0 }
  if (i.reps !== undefined) p.reps = [i.reps, i.reps]
  else p.durationS = i.durationS
  return p
}

/** ankle block (while the injury tag is present) → general mobility → one movement matching the day; only what the pool allows */
export function buildWarmup(r: Restrictions, dayType: DayType, pool: Pool): PlannedExercise[] {
  const available = new Set(Object.values(pool).flat().map((e) => e.slug))
  const has = (i: WarmupItem) => available.has(i.slug)
  const general = [...(r.ankleRehab ? ANKLE : []), ...BASE].filter(has)
  const specific = (dayType === "A" || dayType === "L" ? LOWER : UPPER).filter(has).slice(0, 1)
  return [...general, ...specific].map(toPlanned)
}
