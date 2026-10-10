import type { Exercise } from "@/content/types"
import type { Rows, Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { PlannedSession, Program, Workout, WorkoutSet } from "@/lib/schema"
import { generateBlock } from "./engine/generateBlock"
import type { SessionLog, SessionPlan, SetLog, TestInput } from "./engine/types"
import { isoDate, toPlannedRow, toSessionPlan, type StoredConfig } from "./model"

export interface ProgramRows {
  program: Upsertable<"programs">
  sessions: Upsertable<"planned_sessions">[]
}

export const storedConfig = (p: Program) => p.config as StoredConfig

export function activeProgram(rows: Rows): Program | undefined {
  return Object.values(rows.programs).find((p) => p.active)
}

/** sessions of the current block only (date ≥ blockStart), by date ↑; no such program → [] */
export function plannedSessions(rows: Rows, programId: string): SessionPlan[] {
  const program = rows.programs[programId]
  if (!program) return []
  const from = storedConfig(program).blockStart
  return Object.values(rows.planned_sessions)
    .filter((s) => s.program_id === programId && s.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(toSessionPlan)
}

/** finished workouts keyed by planned_session_id */
export function finishedByPlanned(rows: Rows): Map<string, Workout> {
  const out = new Map<string, Workout>()
  for (const w of Object.values(rows.workouts)) {
    if (w.finished_at !== null && w.planned_session_id) out.set(w.planned_session_id, w)
  }
  return out
}

/** finished workouts as engine session logs, by date ↑ */
export function historyFor(rows: Rows): SessionLog[] {
  const setsByWorkout = new Map<string, WorkoutSet[]>()
  for (const s of Object.values(rows.workout_sets)) {
    const list = setsByWorkout.get(s.workout_id) ?? []
    list.push(s)
    setsByWorkout.set(s.workout_id, list)
  }
  return Object.values(rows.workouts)
    .filter((w) => w.finished_at !== null)
    .map((w) => toSessionLog(w, setsByWorkout.get(w.id) ?? [], w.planned_session_id ? rows.planned_sessions[w.planned_session_id] : undefined))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function toSessionLog(w: Workout, sets: WorkoutSet[], planned: PlannedSession | undefined): SessionLog {
  const plan = planned && toSessionPlan(planned)
  return {
    date: isoDate(w.started_at),
    dayType: plan?.dayType,
    preSoreness: w.pre_soreness ?? undefined,
    preSleep: w.pre_sleep ?? undefined,
    preEnergy: w.pre_energy ?? undefined,
    rpe: w.rpe ?? undefined,
    sets: [...sets].sort((a, b) => a.set_no - b.set_no).map(toSetLog),
    planned: plan?.exercises,
  }
}

const toSetLog = (s: WorkoutSet): SetLog => ({
  slug: s.exercise_id,
  setNo: s.set_no,
  reps: s.reps ?? undefined,
  durationS: s.duration_s ?? undefined,
  weightKg: s.weight_kg ?? undefined,
  rir: s.rir ?? undefined,
})

/** first unfinished session of the active program with date ≥ today */
export function nextSession(rows: Rows, today: string): SessionPlan | undefined {
  const program = activeProgram(rows)
  if (!program) return undefined
  const done = finishedByPlanned(rows)
  return plannedSessions(rows, program.id).find((s) => s.date >= today && !done.has(s.id))
}

/** an active program exists and every session is finished or the last date is past */
export function blockComplete(rows: Rows, today: string): boolean {
  const program = activeProgram(rows)
  if (!program) return false
  const sessions = plannedSessions(rows, program.id)
  const done = finishedByPlanned(rows)
  const last = sessions.at(-1)
  return sessions.every((s) => done.has(s.id)) || (last !== undefined && last.date < today)
}

export function buildProgram(cfg: StoredConfig, exercises: Exercise[], history: SessionLog[], id: string = newId()): ProgramRows {
  const sessions = generateBlock(cfg, exercises, history, cfg.blockIndex, id)
  const template = cfg.profile.days_per_week === 4 ? "upperlower" : "fullbody"
  return {
    program: { id, start_date: cfg.startDate, goal: cfg.profile.goal, template, config: cfg, active: true },
    sessions: sessions.map((s) => toPlannedRow(s, id)),
  }
}

/** the same program row with the next block: config bumped, sessions regenerated from blockStart */
export function nextBlock(program: Program, latestTest: TestInput, blockStart: string, exercises: Exercise[], history: SessionLog[]): ProgramRows {
  const prev = storedConfig(program)
  const cfg: StoredConfig = { ...prev, latestTest, blockIndex: prev.blockIndex + 1, blockStart }
  return buildProgram(cfg, exercises, history, program.id)
}
