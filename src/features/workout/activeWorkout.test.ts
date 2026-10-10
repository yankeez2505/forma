import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { EASED_NOTE } from "@/features/program/engine"
import { programRows } from "@/features/program/engine/fixtures/rows"
import { toPlannedRow } from "@/features/program/model"
import { plannedSessions } from "@/features/program/programService"
import type { Workout } from "@/lib/schema"
import { abortWorkout, completeWorkout, LOGGED, logSet, nextSet, planForStart, progress, resumeDecision, setKey, setRow, startWorkout, toggleDone } from "./activeWorkout"

const rows = programRows()
const first = plannedSessions(rows, "p1")[0]
const row = rows.planned_sessions[first.id]
const now = new Date(2026, 9, 12, 18, 0)
const sore = { soreness: 5, sleep: 4, energy: 4 }
const eased = (p: { exercises: { note?: string }[] }) => p.exercises.some((e) => e.note?.includes(EASED_NOTE))

it("setRow maps a logged set to a deterministic workout_sets row", () => {
  const r = setRow("w1", { slug: "push-up", setNo: 2, reps: 10, rir: 4 })
  expect(r).toEqual({ id: setRow("w1", { slug: "push-up", setNo: 2 }).id, workout_id: "w1", exercise_id: "push-up", set_no: 2, reps: 10, duration_s: null, weight_kg: null, band_kg: null, rir: 4 })
  expect(setKey("push-up", 2)).toBe("push-up#2")
})
it("planForStart prepares the plan and eases it only when the check-in asks", () => {
  expect(planForStart(rows, "missing", null, exercises)).toBeUndefined()
  const calm = planForStart(rows, first.id, { soreness: 2, sleep: 4, energy: 4 }, exercises)!
  expect(calm.plan).toEqual(calm.prepared)
  expect(calm.prepared).toEqual(first)
  const tired = planForStart(rows, first.id, sore, exercises)!
  expect(eased(tired.prepared)).toBe(false)
  expect(eased(tired.plan)).toBe(true)
})
it("startWorkout returns the workout row, the draft with the eased plan and the prepared planned row", () => {
  const { prepared, plan } = planForStart(rows, first.id, sore, exercises)!
  const r = startWorkout(row, prepared, plan, sore, now, "w1")
  expect(r.workout).toEqual({ id: "w1", planned_session_id: first.id, started_at: now.toISOString(), finished_at: null, pre_soreness: 5, pre_sleep: 4, pre_energy: 4, rpe: null, notes: null })
  expect(r.draft).toEqual({ workoutId: "w1", plannedSessionId: first.id, plan, startedAt: now.toISOString(), sets: {}, done: [], restUntil: null })
  expect(r.plannedRow).toEqual(toPlannedRow(prepared, "p1"))
  expect(eased(r.plannedRow as { exercises: { note?: string }[] })).toBe(false)
})
it("nextSet / logSet / progress walk the logged blocks in order", () => {
  const { prepared, plan } = planForStart(rows, first.id, null, exercises)!
  let d = startWorkout(row, prepared, plan, null, now, "w1").draft
  const logged = plan.exercises.filter((e) => LOGGED.includes(e.block))
  const total = logged.reduce((n, e) => n + e.sets, 0)
  expect(progress(d)).toEqual({ done: 0, total })
  expect(nextSet(d)).toEqual({ slug: logged[0].slug, setNo: 1 })
  d = logSet(d, { slug: logged[0].slug, setNo: 1, reps: 10, rir: 4 }, 1000)
  expect(d.sets[setKey(logged[0].slug, 1)]).toEqual({ slug: logged[0].slug, setNo: 1, reps: 10, rir: 4 })
  expect(d.restUntil).toBe(1000 + logged[0].restS * 1000)
  expect(progress(d).done).toBe(1)
  expect(nextSet(d)).not.toEqual({ slug: logged[0].slug, setNo: 1 })
  for (const e of logged) for (let n = 1; n <= e.sets; n++) d = logSet(d, { slug: e.slug, setNo: n, reps: 8 }, 2000)
  expect(nextSet(d)).toBeUndefined()
  expect(d.restUntil).toBeNull()
  expect(progress(d)).toEqual({ done: total, total })
  expect(toggleDone(d, "x").done).toEqual(["x"])
  expect(toggleDone(toggleDone(d, "x"), "x").done).toEqual([])
})
it("completeWorkout / abortWorkout", () => {
  const w: Workout = { id: "w1", user_id: "local", created_at: "", updated_at: "", planned_session_id: first.id, started_at: now.toISOString(), finished_at: null, pre_soreness: null, pre_sleep: null, pre_energy: null, rpe: null, notes: null }
  const end = new Date(2026, 9, 12, 18, 31)
  expect(completeWorkout(w, 7, "  норм ", end)).toMatchObject({ id: "w1", finished_at: end.toISOString(), rpe: 7, notes: "норм" })
  expect(completeWorkout(w, null, "", end).notes).toBeNull()
  expect(abortWorkout(w, 0, end)).toBeNull()
  expect(abortWorkout(w, 2, end)).toMatchObject({ finished_at: end.toISOString(), notes: "Прервано" })
})
it("resumeDecision: continue the same workout or session, ask about another, none without a draft", () => {
  const { prepared, plan } = planForStart(rows, first.id, null, exercises)!
  const d = startWorkout(row, prepared, plan, null, now, "w1").draft
  expect(resumeDecision(null, { workoutId: "w1" })).toBe("none")
  expect(resumeDecision(d, { workoutId: "w1" })).toBe("continue")
  expect(resumeDecision(d, { workoutId: "w2" })).toBe("ask")
  expect(resumeDecision(d, { plannedId: first.id })).toBe("continue")
  expect(resumeDecision(d, { plannedId: "other" })).toBe("ask")
})
