import type { Muscle } from "@/content/types"
import { rollingMean, type Point } from "@/lib/calc"
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
