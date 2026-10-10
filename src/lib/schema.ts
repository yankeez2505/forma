export type Goal = "fat" | "muscle" | "tone"
export type Sex = "male" | "female"
export type Experience = "none" | "some" | "regular"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high"
export type InjuryTag = "ankle" | "knee" | "lower_back" | "shoulder" | "wrist"
export type EquipmentTag = "dumbbell" | "band" | "mat" | "rope" | "roller" | "ball" | "chair" | "wall" | "bar"

interface Base {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

/** id === user_id */
export interface Profile extends Base {
  sex: Sex
  birth_year: number
  height_cm: number
  country: string
  timezone: string
  goal: Goal
  experience: Experience
  days_per_week: 2 | 3 | 4
  session_min: 20 | 30 | 45
  activity_level: ActivityLevel
  injuries: InjuryTag[]
  equipment: EquipmentTag[]
  figure: Sex
}

export interface BodyMetric extends Base {
  date: string
  weight_kg: number | null
  waist_cm: number | null
  neck_cm: number | null
  hip_cm: number | null
}

export interface AnkleTest {
  knee_to_wall_diff_cm: number
  single_leg_calf_raises: number
  balance_eyes_closed_s: number
}

export interface TestRow extends Base {
  date: string
  kind: "baseline" | "checkpoint"
  results: { pushups: number; squats: number; plank_s: number; ankle?: AnkleTest }
}

export interface Program extends Base {
  start_date: string
  goal: Goal
  template: "fullbody" | "upperlower"
  config: unknown
  active: boolean
}

export interface PlannedSession extends Base {
  program_id: string
  date: string
  week: 1 | 2 | 3 | 4
  day_type: "A" | "B" | "U" | "L"
  exercises: unknown[]
  est_min: number
}

export interface Workout extends Base {
  planned_session_id: string | null
  started_at: string
  finished_at: string | null
  pre_soreness: number | null
  pre_sleep: number | null
  pre_energy: number | null
  rpe: number | null
  notes: string | null
}

export interface WorkoutSet extends Base {
  workout_id: string
  exercise_id: string
  set_no: number
  reps: number | null
  duration_s: number | null
  weight_kg: number | null
  band_kg: number | null
  rir: number | null
}

export interface NutritionTarget extends Base {
  date_from: string
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface Tables {
  profiles: Profile
  body_metrics: BodyMetric
  tests: TestRow
  programs: Program
  planned_sessions: PlannedSession
  workouts: Workout
  workout_sets: WorkoutSet
  nutrition_targets: NutritionTarget
}
export type TableName = keyof Tables
export const TABLES: TableName[] = [
  "profiles", "body_metrics", "tests", "programs",
  "planned_sessions", "workouts", "workout_sets", "nutrition_targets",
]
