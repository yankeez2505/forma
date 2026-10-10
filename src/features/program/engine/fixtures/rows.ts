import { all as exercises } from "@/features/exercises/useExercises"
import { emptyRows, type Rows } from "@/lib/db"
import type { Profile } from "@/lib/schema"
import type { StoredConfig } from "../../model"
import { buildProgram, type ProgramRows } from "../../programService"
import { ownerConfig } from "./owner"

export const META = { user_id: "local", created_at: "2026-10-10T00:00:00.000Z", updated_at: "2026-10-10T00:00:00.000Z" }
export const ownerStored: StoredConfig = { ...ownerConfig, blockIndex: 0, blockStart: "2026-10-12" }
export const ownerProfileRow: Profile = {
  id: "local", ...META, sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk",
  goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light",
  injuries: ["ankle"], equipment: [...ownerConfig.profile.equipment], figure: "male",
}

/** the owner's profile plus an active block-0 program: 12 sessions Mon/Wed/Fri from 2026-10-12 */
export function programRows(p: ProgramRows = buildProgram(ownerStored, exercises, [], "p1")): Rows {
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  rows.programs.p1 = { ...p.program, ...META } as Rows["programs"][string]
  for (const s of p.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  return rows
}

type LoggedSet = { slug: string; reps?: number; durationS?: number; weightKg?: number }
/** a finished workout for a planned session; set numbers count per slug */
export function finishSession(rows: Rows, plannedId: string, startedAt: string, sets: LoggedSet[], rpe = 6): void {
  const id = `w-${plannedId}`
  rows.workouts[id] = { id, planned_session_id: plannedId, started_at: startedAt, finished_at: startedAt, pre_soreness: 2, pre_sleep: 4, pre_energy: 4, rpe, notes: null, ...META }
  sets.forEach((s, i) => {
    const set_no = sets.slice(0, i).filter((x) => x.slug === s.slug).length + 1
    rows.workout_sets[`${id}-${i}`] = { id: `${id}-${i}`, workout_id: id, exercise_id: s.slug, set_no, reps: s.reps ?? null, duration_s: s.durationS ?? null, weight_kg: s.weightKg ?? null, band_kg: null, rir: 4, ...META }
  })
}
