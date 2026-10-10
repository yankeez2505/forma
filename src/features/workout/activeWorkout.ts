import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Exercise } from "@/content/types"
import { autoregulate, needsEasing, type Block, type CheckIn, type SessionPlan, type SetLog } from "@/features/program/engine"
import { setId, toPlannedRow, toSessionPlan } from "@/features/program/model"
import { prepareSession } from "@/features/program/prepare"
import { activeProgram, historyFor, storedConfig } from "@/features/program/programService"
import { jsonStorage, type Rows, type Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { PlannedSession, Workout } from "@/lib/schema"

export interface ActiveWorkout {
  workoutId: string
  plannedSessionId: string
  /** the plan actually shown: prepared, then eased by the check-in when needed */
  plan: SessionPlan
  startedAt: string
  /** key = setKey(slug, setNo); only LOGGED blocks */
  sets: Record<string, SetLog>
  /** warm-up / cool-down slugs ticked off (draft only, not stored) */
  done: string[]
  /** epoch ms */
  restUntil: number | null
}
export const LOGGED: Block[] = ["main", "finisher"]
export const ABORT_NOTE = "Прервано"
export const setKey = (slug: string, setNo: number) => `${slug}#${setNo}`

export function setRow(workoutId: string, s: SetLog): Upsertable<"workout_sets"> {
  return {
    id: setId(workoutId, s.slug, s.setNo),
    workout_id: workoutId,
    exercise_id: s.slug,
    set_no: s.setNo,
    reps: s.reps ?? null,
    duration_s: s.durationS ?? null,
    weight_kg: s.weightKg ?? null,
    band_kg: null,
    rir: s.rir ?? null,
  }
}

const todo = (...used: unknown[]): never => {
  void used
  throw new Error("not implemented")
}
export function planForStart(rows: Rows, plannedId: string, checkIn: CheckIn | null, exercises: Exercise[]): { prepared: SessionPlan; plan: SessionPlan } | undefined {
  const row = rows.planned_sessions[plannedId]
  const program = activeProgram(rows)
  if (!row || !program) return undefined
  const prepared = prepareSession(toSessionPlan(row), historyFor(rows), storedConfig(program), exercises)
  const plan = checkIn && needsEasing(checkIn) ? autoregulate(prepared, checkIn) : prepared
  return { prepared, plan }
}
export function startWorkout(row: PlannedSession, prepared: SessionPlan, plan: SessionPlan, checkIn: CheckIn | null, now: Date, id: string = newId()): { workout: Upsertable<"workouts">; draft: ActiveWorkout; plannedRow: Upsertable<"planned_sessions"> } {
  const startedAt = now.toISOString()
  return {
    workout: {
      id,
      planned_session_id: row.id,
      started_at: startedAt,
      finished_at: null,
      pre_soreness: checkIn?.soreness ?? null,
      pre_sleep: checkIn?.sleep ?? null,
      pre_energy: checkIn?.energy ?? null,
      rpe: null,
      notes: null,
    },
    draft: { workoutId: id, plannedSessionId: row.id, plan, startedAt, sets: {}, done: [], restUntil: null },
    plannedRow: toPlannedRow(prepared, row.program_id),
  }
}
const loggedExercises = (d: ActiveWorkout) => d.plan.exercises.filter((e) => LOGGED.includes(e.block))

/** first set of the logged blocks, in plan order, that has no log yet */
export function nextSet(d: ActiveWorkout): { slug: string; setNo: number } | undefined {
  for (const e of loggedExercises(d)) for (let n = 1; n <= e.sets; n++) if (!d.sets[setKey(e.slug, n)]) return { slug: e.slug, setNo: n }
  return undefined
}
export function progress(d: ActiveWorkout): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const e of loggedExercises(d)) for (let n = 1; n <= e.sets; n++) {
    total++
    if (d.sets[setKey(e.slug, n)]) done++
  }
  return { done, total }
}
/** records a set; rest starts only when another set is still ahead */
export function logSet(d: ActiveWorkout, s: SetLog, nowMs: number): ActiveWorkout {
  const next = { ...d, sets: { ...d.sets, [setKey(s.slug, s.setNo)]: s } }
  const restS = d.plan.exercises.find((e) => e.slug === s.slug)?.restS ?? 0
  return { ...next, restUntil: nextSet(next) && restS > 0 ? nowMs + restS * 1000 : null }
}
export const toggleDone = (d: ActiveWorkout, slug: string): ActiveWorkout => ({
  ...d,
  done: d.done.includes(slug) ? d.done.filter((x) => x !== slug) : [...d.done, slug],
})
export function completeWorkout(w: Workout, rpe: number | null, notes: string | null, now: Date): Upsertable<"workouts"> {
  return { ...w, finished_at: now.toISOString(), rpe, notes: notes?.trim() || null }
}
/** an abort with logged sets is kept as a finished workout; with none the row stays open and history ignores it */
export function abortWorkout(w: Workout, loggedSets: number, now: Date): Upsertable<"workouts"> | null {
  return loggedSets > 0 ? { ...w, finished_at: now.toISOString(), notes: ABORT_NOTE } : null
}
export function resumeDecision(draft: ActiveWorkout | null, req: { workoutId: string } | { plannedId: string }): "continue" | "ask" | "none" {
  return todo(draft, req)
}
interface ActiveWorkoutStore {
  draft: ActiveWorkout | null
  set(d: ActiveWorkout | null): void
}
export const useActiveWorkout = create<ActiveWorkoutStore>()(
  persist((set) => ({ draft: null, set: (draft) => set({ draft }) }), { name: "forma-active-workout", storage: jsonStorage() }),
)
