import type { Exercise } from "@/content/types"
import type { Rows, Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { Program, Workout } from "@/lib/schema"
import type { SessionLog, SessionPlan, TestInput } from "./engine/types"
import type { StoredConfig } from "./model"

export interface ProgramRows {
  program: Upsertable<"programs">
  sessions: Upsertable<"planned_sessions">[]
}

export const storedConfig = (p: Program) => p.config as StoredConfig

export function activeProgram(_rows: Rows): Program | undefined {
  throw new Error("not implemented")
}

/** sessions of the current block only (date ≥ blockStart), by date ↑; no such program → [] */
export function plannedSessions(_rows: Rows, _programId: string): SessionPlan[] {
  throw new Error("not implemented")
}

/** finished workouts keyed by planned_session_id */
export function finishedByPlanned(_rows: Rows): Map<string, Workout> {
  throw new Error("not implemented")
}

/** finished workouts as engine session logs, by date ↑ */
export function historyFor(_rows: Rows): SessionLog[] {
  throw new Error("not implemented")
}

/** first unfinished session of the active program with date ≥ today */
export function nextSession(_rows: Rows, _today: string): SessionPlan | undefined {
  throw new Error("not implemented")
}

/** an active program exists and every session is finished or the last date is past */
export function blockComplete(_rows: Rows, _today: string): boolean {
  throw new Error("not implemented")
}

export function buildProgram(_cfg: StoredConfig, _exercises: Exercise[], _history: SessionLog[], _id: string = newId()): ProgramRows {
  throw new Error("not implemented")
}

/** the same program row with the next block: config bumped, sessions regenerated from blockStart */
export function nextBlock(_program: Program, _latestTest: TestInput, _blockStart: string, _exercises: Exercise[], _history: SessionLog[]): ProgramRows {
  throw new Error("not implemented")
}
