import type { Exercise, Muscle } from "@/content/types"
import { isoDate } from "@/features/program/model"
import { rollingMean, type Point } from "@/lib/calc"
import { addDays } from "@/lib/dates"
import type { Rows } from "@/lib/db"

export type MuscleGroup = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core" | "calves"

export const MUSCLE_GROUP: Record<Muscle, MuscleGroup> = {
  chest: "chest",
  "middle back": "back",
  "lower back": "back",
  lats: "back",
  traps: "back",
  neck: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  quadriceps: "legs",
  hamstrings: "legs",
  adductors: "legs",
  abductors: "legs",
  glutes: "glutes",
  abdominals: "core",
  calves: "calves",
}

export const GROUP_RU: Record<MuscleGroup, string> = {
  chest: "Грудь",
  back: "Спина",
  shoulders: "Плечи",
  arms: "Руки",
  legs: "Ноги",
  glutes: "Ягодицы",
  core: "Кор",
  calves: "Икры",
}

export type MetricKey = "weight_kg" | "waist_cm" | "neck_cm" | "hip_cm"

/** non-null values of one metric, by date ascending */
export function metricSeries(rows: Rows, key: MetricKey): Point[] {
  return Object.values(rows.body_metrics)
    .filter((m) => m[key] !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, value: m[key] as number }))
}

export function latestValue(rows: Rows, key: MetricKey): Point | undefined {
  return metricSeries(rows, key).at(-1)
}

export function weightTrend(rows: Rows): { raw: Point[]; mean: Point[] } {
  const raw = metricSeries(rows, "weight_kg")
  return { raw, mean: rollingMean(raw, 7) }
}

const emptyGroups = (): Record<MuscleGroup, number> => ({ chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, glutes: 0, core: 0, calves: 0 })

/** sets logged in finished workouts of the week starting weekStart; a set counts once per distinct primary group of its exercise */
export function weeklySetsByGroup(rows: Rows, exercises: Map<string, Exercise>, weekStart: string): Record<MuscleGroup, number> {
  const end = addDays(weekStart, 6)
  const inWeek = new Set(
    Object.values(rows.workouts)
      .filter((w) => w.finished_at !== null && isoDate(w.started_at) >= weekStart && isoDate(w.started_at) <= end)
      .map((w) => w.id),
  )
  const out = emptyGroups()
  for (const s of Object.values(rows.workout_sets)) {
    if (!inWeek.has(s.workout_id)) continue
    const e = exercises.get(s.exercise_id)
    if (!e) continue
    for (const g of new Set(e.primaryMuscles.map((m) => MUSCLE_GROUP[m]))) out[g] += 1
  }
  return out
}
