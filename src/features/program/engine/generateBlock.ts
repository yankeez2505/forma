import type { Exercise, Pattern } from "@/content/types"
import { addDays } from "@/lib/dates"
import type { EquipmentTag } from "@/lib/schema"
import { pickExercise, startDuration, startRank, startReps } from "./baseline"
import { estimateMinutes } from "./estimate"
import { applyGoal } from "./goals"
import { capSets, setCap, totalMainSets, weekParams } from "./periodization"
import { buildPool } from "./pool"
import { progressExercise } from "./progression"
import { deriveRestrictions } from "./restrictions"
import { sessionDates } from "./schedule"
import { hashString, hashToUuid, mulberry32 } from "./seed"
import { dayTypeFor, getTemplate } from "./templates"
import {
  DUMBBELL_KG,
  type DayTemplate,
  type PlannedExercise,
  type Pool,
  type ProgramConfig,
  type SessionLog,
  type SessionPlan,
  type SetLog,
  type TestInput,
} from "./types"
import { buildWarmup } from "./warmup"

/** patterns the baseline test grades: a weak result gets the easiest variant only, no variety */
const TESTED: Pattern[] = ["push_h", "squat", "core"]
const FALLBACK_NOTE = "Замена: нет инвентаря"
/** home substitutes that deserve a note even though the pattern still has a candidate */
const SUBSTITUTE: Partial<Record<Pattern, { needs: EquipmentTag; note: string }>> = {
  pull_v: { needs: "bar", note: "Замена: нет турника" },
}
const DAYS_PER_BLOCK = 28

function buildPlanned(ex: Exercise, sets: number, test: TestInput, note?: string): PlannedExercise {
  const p: PlannedExercise = { slug: ex.slug, block: "main", sets, targetRir: 4, restS: ex.timed ? 30 : 60 }
  if (ex.timed) p.durationS = startDuration(test, ex.slug)
  else p.reps = startReps(ex.pattern, test)
  if (ex.equipment.includes("dumbbell")) p.loadKg = DUMBBELL_KG
  if (note) p.note = note
  return p
}

/** the exercise from this list the user logged most recently, if any (history is newest first) */
function anchor(recent: SessionLog[], list: Exercise[]): Exercise | undefined {
  for (const s of recent) {
    const hit = s.sets.find((x) => list.some((e) => e.slug === x.slug))
    if (hit) return list.find((e) => e.slug === hit.slug)
  }
  return undefined
}

/** logged sets of a slug from its two most recent sessions, newest first */
function lastTwo(recent: SessionLog[], slug: string): SetLog[][] {
  return recent
    .map((s) => s.sets.filter((x) => x.slug === slug))
    .filter((sets) => sets.length > 0)
    .slice(0, 2)
}

/** the dose this slug was last planned with (history is newest first) */
function lastPlanned(recent: SessionLog[], slug: string): PlannedExercise | undefined {
  for (const s of recent) {
    const hit = s.planned?.find((e) => e.block === "main" && e.slug === slug)
    if (hit) return hit
  }
  return undefined
}

/** main work for one day type: one exercise per slot, continued and progressed from history when logged */
function planDay(day: DayTemplate, pool: Pool, cfg: ProgramConfig, recent: SessionLog[], rng: () => number): PlannedExercise[] {
  const out: PlannedExercise[] = []
  const used = new Set<string>()
  for (const slot of day.slots) {
    let pattern = slot.pattern
    let note: string | undefined
    if (pool[pattern].length === 0 && slot.fallback) {
      pattern = slot.fallback
      note = FALLBACK_NOTE
    }
    const list = pool[pattern]
    if (list.length === 0) continue
    const sub = SUBSTITUTE[slot.pattern]
    if (sub && !cfg.profile.equipment.includes(sub.needs)) note = sub.note
    const fresh = list.filter((e) => !used.has(e.slug))
    const candidates = fresh.length ? fresh : list
    const rank = startRank(pattern, cfg.latestTest)
    const variety = TESTED.includes(pattern) && rank === 1 ? 1 : 2
    const ex = anchor(recent, candidates) ?? pickExercise(candidates, rank, rng, variety)
    if (!ex) continue
    used.add(ex.slug)
    const prev = lastPlanned(recent, ex.slug) ?? buildPlanned(ex, slot.sets, cfg.latestTest, note)
    const next = progressExercise(prev, lastTwo(recent, ex.slug), list, ex)
    /** sets restart from the template: a deload or a time trim in the last plan must not become the new base */
    const planned: PlannedExercise = { ...next, sets: Math.max(next.sets, slot.sets) }
    if (note) planned.note = note
    else delete planned.note
    out.push(planned)
  }
  return out
}

/** drop one main set at a time from the end, round-robin, until the session fits the time budget */
function fitToTime(exs: PlannedExercise[], limitMin: number): PlannedExercise[] {
  const out = exs.map((e) => ({ ...e }))
  const main = out.filter((e) => e.block === "main")
  let i = main.length - 1
  while (estimateMinutes(out) > limitMin && main.some((e) => e.sets > 1)) {
    if (main[i].sets > 1) main[i].sets -= 1
    i = (i - 1 + main.length) % main.length
  }
  return out
}

/** one 4-week block: identical for the same config, seed, history and block index */
export function generateBlock(
  cfg: ProgramConfig,
  exercises: Exercise[],
  history: SessionLog[],
  blockIndex: number,
  programId: string,
): SessionPlan[] {
  const { profile } = cfg
  const r = deriveRestrictions(profile, cfg.latestTest)
  const pool = buildPool(exercises, profile, r)
  const tpl = getTemplate(profile.days_per_week)
  const rng = mulberry32(hashString(`${cfg.seed}:${blockIndex}`))
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date))
  const days = new Map(tpl.days.map((d) => [d.dayType, planDay(d, pool, cfg, recent, rng)] as const))
  const cap = setCap(blockIndex, profile.goal)
  const dates = sessionDates(addDays(cfg.startDate, DAYS_PER_BLOCK * blockIndex), profile.days_per_week)
  return dates.map(({ date, week }, i) => {
    const dayType = dayTypeFor(tpl, i)
    const { rir, setScale } = weekParams(week, blockIndex)
    const capped = capSets(days.get(dayType)!.map((e) => ({ ...e, targetRir: rir[0] })), cap)
    /** deload trims the session total, so a 5-exercise day cannot round its way above the week's share */
    const main = capSets(capped, Math.floor(totalMainSets(capped) * setScale))
    const withGoal = applyGoal(profile.goal, main, r, pool, blockIndex, rng)
    const exs = fitToTime([...buildWarmup(r, dayType, pool), ...withGoal], profile.session_min)
    return { id: hashToUuid(`${programId}:${date}`), date, week, dayType, exercises: exs, estMin: estimateMinutes(exs) }
  })
}
