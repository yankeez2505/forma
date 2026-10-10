import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { emptyRows } from "@/lib/db"
import { GROUP_RU, latestValue, metricSeries, MUSCLE_GROUP, weightTrend } from "./stats"

const metric = (id: string, date: string, weight_kg: number | null, waist_cm: number | null = null, neck_cm: number | null = null, hip_cm: number | null = null) =>
  ({ id, user_id: "local", created_at: "", updated_at: "", date, weight_kg, waist_cm, neck_cm, hip_cm })

it("every muscle maps to a labelled group and every exercise's muscles are covered", () => {
  expect(Object.keys(MUSCLE_GROUP)).toHaveLength(17)
  expect(new Set(Object.values(MUSCLE_GROUP))).toEqual(new Set(Object.keys(GROUP_RU)))
  expect(exercises.every((e) => [...e.primaryMuscles, ...e.secondaryMuscles].every((m) => m in MUSCLE_GROUP))).toBe(true)
})
it("metricSeries skips nulls and sorts by date; latestValue; weightTrend has a 7-day mean", () => {
  const rows = emptyRows()
  rows.body_metrics.b = metric("b", "2026-10-14", 81)
  rows.body_metrics.a = metric("a", "2026-10-12", 82)
  rows.body_metrics.c = metric("c", "2026-10-16", null, 90)
  expect(metricSeries(rows, "weight_kg")).toEqual([{ date: "2026-10-12", value: 82 }, { date: "2026-10-14", value: 81 }])
  expect(latestValue(rows, "weight_kg")).toEqual({ date: "2026-10-14", value: 81 })
  expect(latestValue(rows, "waist_cm")).toEqual({ date: "2026-10-16", value: 90 })
  expect(latestValue(rows, "hip_cm")).toBeUndefined()
  expect(weightTrend(rows).mean).toEqual([{ date: "2026-10-12", value: 82 }, { date: "2026-10-14", value: 81.5 }])
})
