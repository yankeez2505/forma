import type { Exercise } from "@/content/types"
import { ANKLE_CRITERIA } from "@/features/program/engine/restrictions"
import type { TestInput } from "@/features/program/engine/types"
import { newConfig, profileInput, testId } from "@/features/program/model"
import { activeProgram, buildProgram, finishedByPlanned, historyFor, nextBlock, plannedSessions, type ProgramRows } from "@/features/program/programService"
import type { Rows, Upsertable } from "@/lib/db"
import { newId } from "@/lib/id"
import type { AnkleTest, TestRow } from "@/lib/schema"

export interface Criterion {
  key: keyof AnkleTest
  label: string
  value: number | undefined
  target: number
  op: "≤" | "≥"
  ok: boolean
}

const CRITERIA: Omit<Criterion, "value" | "ok">[] = [
  { key: "knee_to_wall_diff_cm", label: "Knee-to-wall: разница между ногами, см", target: ANKLE_CRITERIA.kneeToWallDiffCm, op: "≤" },
  { key: "single_leg_calf_raises", label: "Подъёмы на носок на одной ноге, раз", target: ANKLE_CRITERIA.singleLegCalfRaises, op: "≥" },
  { key: "balance_eyes_closed_s", label: "Баланс с закрытыми глазами, с", target: ANKLE_CRITERIA.balanceEyesClosedS, op: "≥" },
]

/** the three ankle criteria with pass marks; cleared only when every one passes */
export function ankleStatus(ankle: Partial<AnkleTest> | undefined): { cleared: boolean; criteria: Criterion[] } {
  const criteria = CRITERIA.map((c) => {
    const value = ankle?.[c.key]
    const ok = value !== undefined && (c.op === "≤" ? value <= c.target : value >= c.target)
    return { ...c, value, ok }
  })
  return { cleared: criteria.every((c) => c.ok), criteria }
}

export const KIND_RU: Record<TestRow["kind"], string> = { baseline: "Базовый", checkpoint: "Чекпоинт" }

const KIND_RANK: Record<TestRow["kind"], number> = { baseline: 0, checkpoint: 1 }

/** newest test; a checkpoint outranks a baseline taken the same day */
export function latestTest(rows: Rows): TestRow | undefined {
  return Object.values(rows.tests).sort((a, b) => b.date.localeCompare(a.date) || KIND_RANK[b.kind] - KIND_RANK[a.kind])[0]
}

/** planned sessions of the active program without a finished workout; 0 without a program */
export function remainingSessions(rows: Rows): number {
  const program = activeProgram(rows)
  if (!program) return 0
  const finished = finishedByPlanned(rows)
  return plannedSessions(rows, program.id).filter((s) => !finished.has(s.id)).length
}

/** rows for a finished (re)test: the test row plus the next block of the active program, or block 0 when there is none */
export function checkpointRows(rows: Rows, results: TestRow["results"], userId: string, today: string, exercises: Exercise[]): { test: Upsertable<"tests">; program: ProgramRows } {
  const profile = rows.profiles[userId]
  if (!profile) throw new Error("no profile")
  const kind: TestRow["kind"] = latestTest(rows) ? "checkpoint" : "baseline"
  const input: TestInput = { ...results, date: today }
  const history = historyFor(rows)
  const active = activeProgram(rows)
  const program = active ? nextBlock(active, profileInput(profile), input, today, exercises, history) : buildProgram(newConfig(profileInput(profile), input, today, newId()), exercises, history)
  return { test: { id: testId(userId, today, kind), date: today, kind, results }, program }
}
