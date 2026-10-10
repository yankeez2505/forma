import type { Exercise } from "@/content/types"
import type { SessionLog } from "@/features/program/engine/types"
import { newConfig, profileInput, type StoredConfig } from "@/features/program/model"
import { buildProgram, storedConfig, type ProgramRows } from "@/features/program/programService"
import type { Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { Profile, Program, TestRow } from "@/lib/schema"

/** profile fields the program engine reads */
export const PROGRAM_FIELDS = ["goal", "experience", "days_per_week", "session_min", "injuries", "equipment"] as const

const key = (v: Profile[(typeof PROGRAM_FIELDS)[number]]) => (Array.isArray(v) ? [...v].sort().join(",") : String(v))

/** true when any program field differs between two profiles (arrays compared as sets) */
export const programAffected = (a: Profile, b: Profile): boolean => PROGRAM_FIELDS.some((k) => key(a[k]) !== key(b[k]))

/** a fresh program from the edited profile: starts today, keeps the old block index, deactivates the old row */
export function restartProgram(old: Program | undefined, profile: Profile, latest: TestRow, today: string, exercises: Exercise[], history: SessionLog[], id: string = newId()): { deactivate?: Upsertable<"programs">; program: ProgramRows } {
  const cfg: StoredConfig = { ...newConfig(profileInput(profile), { ...latest.results, date: latest.date }, today, id), blockIndex: old ? storedConfig(old).blockIndex : 0 }
  const program = buildProgram(cfg, exercises, history, id)
  if (!old) return { program }
  return { deactivate: { id: old.id, start_date: old.start_date, goal: old.goal, template: old.template, config: old.config, active: false }, program }
}
