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
  return todo(row, prepared, plan, checkIn, now, id)
}
export function nextSet(d: ActiveWorkout): { slug: string; setNo: number } | undefined {
  return todo(d)
}
export function progress(d: ActiveWorkout): { done: number; total: number } {
  return todo(d)
}
export function logSet(d: ActiveWorkout, s: SetLog, nowMs: number): ActiveWorkout {
  return todo(d, s, nowMs)
}
export const toggleDone = (d: ActiveWorkout, slug: string): ActiveWorkout => todo(d, slug)
export function completeWorkout(w: Workout, rpe: number | null, notes: string | null, now: Date): Upsertable<"workouts"> {
  return todo(w, rpe, notes, now)
}
export function abortWorkout(w: Workout, loggedSets: number, now: Date): Upsertable<"workouts"> | null {
  return todo(w, loggedSets, now)
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
// keep unused imports referenced until their functions land
void toPlannedRow
