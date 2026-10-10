import type { Exercise } from "@/content/types"
import type { Rows, Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { Program, Workout } from "@/lib/schema"
import { generateBlock } from "./engine/generateBlock"
import type { SessionLog, SessionPlan, TestInput } from "./engine/types"
import { toPlannedRow, type StoredConfig } from "./model"

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

export function buildProgram(cfg: StoredConfig, exercises: Exercise[], history: SessionLog[], id: string = newId()): ProgramRows {
  const sessions = generateBlock(cfg, exercises, history, cfg.blockIndex, id)
  const template = cfg.profile.days_per_week === 4 ? "upperlower" : "fullbody"
  return {
    program: { id, start_date: cfg.startDate, goal: cfg.profile.goal, template, config: cfg, active: true },
    sessions: sessions.map((s) => toPlannedRow(s, id)),
  }
}

/** the same program row with the next block: config bumped, sessions regenerated from blockStart */
export function nextBlock(_program: Program, _latestTest: TestInput, _blockStart: string, _exercises: Exercise[], _history: SessionLog[]): ProgramRows {
  throw new Error("not implemented")
}
