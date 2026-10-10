import { toISODate } from "@/lib/dates"
import type { Upsertable } from "@/lib/db"
import type { PlannedSession, Profile, TestRow } from "@/lib/schema"
import { hashToUuid } from "./engine/seed"
import type { PlannedExercise, ProfileInput, ProgramConfig, SessionPlan, TestInput } from "./engine/types"

/** programs.config: the engine config plus where the current block sits */
export interface StoredConfig extends ProgramConfig {
  blockIndex: number
  blockStart: string
}

/** one body-metrics row per user and day */
export const metricId = (userId: string, date: string) => hashToUuid(`bm:${userId}:${date}`)
/** one nutrition target per user and start day */
export const targetId = (userId: string, date: string) => hashToUuid(`nt:${userId}:${date}`)
/** one set row per workout, exercise and set number — re-logging a set overwrites it */
export const setId = (workoutId: string, slug: string, setNo: number) => hashToUuid(`set:${workoutId}:${slug}:${setNo}`)
/** one test per user, day and kind */
export const testId = (userId: string, date: string, kind: TestRow["kind"]) => hashToUuid(`test:${userId}:${date}:${kind}`)

export function toPlannedRow(s: SessionPlan, programId: string): Upsertable<"planned_sessions"> {
  return { id: s.id, program_id: programId, date: s.date, week: s.week, day_type: s.dayType, exercises: s.exercises, est_min: s.estMin }
}

export function toSessionPlan(row: PlannedSession): SessionPlan {
  return { id: row.id, date: row.date, week: row.week, dayType: row.day_type, exercises: row.exercises as PlannedExercise[], estMin: row.est_min }
}

/** local calendar day of an ISO timestamp */
export const isoDate = (timestamp: string) => toISODate(new Date(timestamp))

/** block 0 from a fresh survey: the baseline doubles as the latest test */
export function newConfig(profile: ProfileInput, baseline: TestInput, startDate: string, seed: string): StoredConfig {
  return { profile, baseline, latestTest: baseline, startDate, seed, generatorVersion: 1, blockIndex: 0, blockStart: startDate }
}

/** Profile row → the engine's ProfileInput */
export const profileInput = (p: Pick<Profile, "sex" | "birth_year" | "goal" | "experience" | "days_per_week" | "session_min" | "injuries" | "equipment">): ProfileInput => ({
  sex: p.sex,
  birth_year: p.birth_year,
  goal: p.goal,
  experience: p.experience,
  days_per_week: p.days_per_week,
  session_min: p.session_min,
  injuries: p.injuries,
  equipment: p.equipment,
})
