import { ANKLE_CRITERIA } from "@/features/program/engine/restrictions"
import type { Rows } from "@/lib/db"
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
