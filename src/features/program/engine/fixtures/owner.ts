import type { AnkleTest } from "@/lib/schema"
import type { ProfileInput, ProgramConfig, TestInput } from "../types"

/** the owner's profile; birth year is a placeholder until onboarding */
export const ownerProfile: ProfileInput = {
  sex: "male",
  birth_year: 1990,
  goal: "fat",
  experience: "some",
  days_per_week: 3,
  session_min: 30,
  injuries: ["ankle"],
  equipment: ["dumbbell", "band", "mat", "rope", "roller", "ball", "chair", "wall"],
}

export const ownerBaseline: TestInput = {
  date: "2026-10-10",
  pushups: 12,
  squats: 25,
  plank_s: 40,
  ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 },
}

export const ownerConfig: ProgramConfig = {
  profile: ownerProfile,
  baseline: ownerBaseline,
  latestTest: ownerBaseline,
  startDate: "2026-10-10",
  seed: "owner-1",
  generatorVersion: 1,
}

export const clearedAnkle: AnkleTest = { knee_to_wall_diff_cm: 0.5, single_leg_calf_raises: 26, balance_eyes_closed_s: 30 }
