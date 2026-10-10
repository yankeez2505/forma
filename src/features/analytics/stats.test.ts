import { expect, it } from "vitest"
import { all as exercises, bySlug } from "@/features/exercises/useExercises"
import { finishSession, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { metricId } from "@/features/program/model"
import { plannedSessions } from "@/features/program/programService"
import { navyBodyFat } from "@/lib/calc"
import { emptyRows } from "@/lib/db"
import { bodyFatNow, GROUP_RU, latestValue, mergeMetric, metricSeries, MUSCLE_GROUP, planVsFact, testSeries, weeklySetsByGroup, weightTrend } from "./stats"

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
it("weeklySetsByGroup counts a set once per primary muscle group", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  const push = exercises.find((e) => e.pattern === "push_h")!
  const squat = exercises.find((e) => e.pattern === "squat")!
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [{ slug: push.slug, reps: 10 }, { slug: push.slug, reps: 8 }, { slug: squat.slug, reps: 15 }, { slug: "unknown-slug", reps: 1 }])
  finishSession(rows, s[3].id, "2026-10-19T18:00:00.000Z", [{ slug: push.slug, reps: 10 }])
  const groups = weeklySetsByGroup(rows, bySlug, "2026-10-12")
  const expected: Record<string, number> = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, glutes: 0, core: 0, calves: 0 }
  for (const g of new Set(push.primaryMuscles.map((m) => MUSCLE_GROUP[m]))) expected[g] += 2
  for (const g of new Set(squat.primaryMuscles.map((m) => MUSCLE_GROUP[m]))) expected[g] += 1
  expect(groups).toEqual(expected)
})
it("planVsFact returns the last weeks ending with the current one", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [])
  expect(planVsFact(rows, "2026-10-21", 3)).toEqual([
    { week: "2026-10-05", planned: 0, done: 0 },
    { week: "2026-10-12", planned: 3, done: 1 },
    { week: "2026-10-19", planned: 3, done: 0 },
  ])
})
it("testSeries sorts by date; bodyFatNow needs waist and neck, plus hip for women", () => {
  const rows = emptyRows()
  rows.tests.t2 = { id: "t2", user_id: "local", created_at: "", updated_at: "", date: "2026-11-09", kind: "checkpoint", results: { pushups: 18, squats: 30, plank_s: 60 } }
  rows.tests.t1 = { id: "t1", user_id: "local", created_at: "", updated_at: "", date: "2026-10-12", kind: "baseline", results: { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2, single_leg_calf_raises: 10, balance_eyes_closed_s: 10 } } }
  expect(testSeries(rows)).toEqual([{ date: "2026-10-12", kind: "baseline", pushups: 12, squats: 25, plank_s: 40 }, { date: "2026-11-09", kind: "checkpoint", pushups: 18, squats: 30, plank_s: 60 }])
  expect(bodyFatNow(rows, ownerProfileRow)).toBeNull()
  rows.body_metrics.a = metric("a", "2026-10-12", 82, 90, 40)
  rows.body_metrics.b = metric("b", "2026-10-14", 81)
  expect(bodyFatNow(rows, ownerProfileRow)).toBeCloseTo(navyBodyFat({ sex: "male", heightCm: 180, waistCm: 90, neckCm: 40 })!, 5)
  expect(bodyFatNow(rows, { sex: "female", height_cm: 165 })).toBeNull()
  rows.body_metrics.a.hip_cm = 100
  expect(bodyFatNow(rows, { sex: "female", height_cm: 165 })).not.toBeNull()
})
it("mergeMetric keeps fields missing from the patch and uses the deterministic id", () => {
  const existing = metric("x", "2026-10-12", 82, 90, null)
  expect(mergeMetric(existing, { weight_kg: 81.5, neck_cm: 40 }, "local", "2026-10-12")).toEqual({ id: metricId("local", "2026-10-12"), date: "2026-10-12", weight_kg: 81.5, waist_cm: 90, neck_cm: 40, hip_cm: null })
  expect(mergeMetric(undefined, { weight_kg: 80 }, "local", "2026-10-13")).toEqual({ id: metricId("local", "2026-10-13"), date: "2026-10-13", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
  expect(mergeMetric(existing, { waist_cm: null }, "local", "2026-10-12").waist_cm).toBeNull()
})
