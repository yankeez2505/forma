import type { SessionPlan } from "@/features/program/engine"
import { activeProgram, blockComplete, finishedByPlanned, plannedSessions } from "@/features/program/programService"
import type { ActiveWorkout } from "@/features/workout/activeWorkout"
import { diffDays } from "@/lib/dates"
import type { Rows } from "@/lib/db"
import type { Workout } from "@/lib/schema"

/** a skipped session is still offered this many days after its date */
export const MISS_WINDOW_DAYS = 6

export type TodayState =
  | { kind: "noProfile" }
  | { kind: "resume"; draft: ActiveWorkout }
  | { kind: "noProgram" }
  | { kind: "done"; plan: SessionPlan; workout: Workout; next?: SessionPlan }
  | { kind: "session"; plan: SessionPlan }
  | { kind: "blockDone" }
  | { kind: "missed"; plan: SessionPlan; next?: SessionPlan }
  | { kind: "rest"; next?: SessionPlan }

/** what the home screen shows today; checks run in the order the union is declared */
export function todayState(rows: Rows, userId: string, draft: ActiveWorkout | null, today: string): TodayState {
  if (!rows.profiles[userId]) return { kind: "noProfile" }
  if (draft) return { kind: "resume", draft }
  const program = activeProgram(rows)
  if (!program) return { kind: "noProgram" }
  const sessions = plannedSessions(rows, program.id)
  const done = finishedByPlanned(rows)
  const next = sessions.find((s) => s.date > today && !done.has(s.id))
  const todays = sessions.find((s) => s.date === today)
  if (todays) {
    const workout = done.get(todays.id)
    return workout ? { kind: "done", plan: todays, workout, next } : { kind: "session", plan: todays }
  }
  if (blockComplete(rows, today)) return { kind: "blockDone" }
  const missed = sessions.filter((s) => s.date < today && !done.has(s.id)).at(-1)
  if (missed && diffDays(missed.date, today) <= MISS_WINDOW_DAYS) return { kind: "missed", plan: missed, next }
  return { kind: "rest", next }
}
