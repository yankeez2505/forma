import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { finishSession, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { plannedSessions } from "@/features/program/programService"
import { planForStart, startWorkout, type ActiveWorkout } from "@/features/workout/activeWorkout"
import { emptyRows, type Rows } from "@/lib/db"
import { todayState } from "./todayState"

const S = (rows: Rows, today: string, draft: ActiveWorkout | null = null) => todayState(rows, "local", draft, today)

it("noProfile without a profile row, noProgram without an active program", () => {
  expect(S(emptyRows(), "2026-10-12")).toEqual({ kind: "noProfile" })
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  expect(S(rows, "2026-10-12")).toEqual({ kind: "noProgram" })
})
it("session today → resume with a draft → done after finishing", () => {
  const rows = programRows()
  const [a, b] = plannedSessions(rows, "p1")
  expect(S(rows, "2026-10-12")).toEqual({ kind: "session", plan: a })
  const { prepared, plan } = planForStart(rows, a.id, null, exercises)!
  const draft = startWorkout(rows.planned_sessions[a.id], prepared, plan, null, new Date(2026, 9, 12, 18), "w1").draft
  expect(S(rows, "2026-10-12", draft)).toEqual({ kind: "resume", draft })
  finishSession(rows, a.id, "2026-10-12T18:00:00.000Z", [])
  expect(S(rows, "2026-10-12")).toMatchObject({ kind: "done", plan: a, next: b, workout: { id: `w-${a.id}` } })
})
it("rest with the next session; a miss within 6 days is offered, older ones are not", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1") // 10-12, 10-14, 10-16, 10-19, 10-21, 10-23, …
  expect(S(rows, "2026-10-13")).toEqual({ kind: "missed", plan: s[0], next: s[1] })
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [])
  expect(S(rows, "2026-10-13")).toEqual({ kind: "rest", next: s[1] })
  expect(S(rows, "2026-10-20")).toMatchObject({ kind: "missed", plan: s[3], next: s[4] })
  for (const x of s.slice(1)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  rows.workouts[`w-${s[1].id}`].finished_at = null
  expect(S(rows, "2026-10-20")).toMatchObject({ kind: "missed", plan: s[1] }) // 6 days old
  expect(S(rows, "2026-10-22")).toEqual({ kind: "rest" }) // 8 days old → rest, nothing next
})
it("blockDone after the last date or when every session is finished; today's finished session wins", () => {
  const rows = programRows()
  expect(S(rows, "2026-11-06")).toMatchObject({ kind: "session" })
  expect(S(rows, "2026-11-07")).toEqual({ kind: "blockDone" })
  for (const x of plannedSessions(rows, "p1")) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(S(rows, "2026-11-05")).toEqual({ kind: "blockDone" })
  expect(S(rows, "2026-11-06")).toMatchObject({ kind: "done", next: undefined })
})
