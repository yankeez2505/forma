import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { ownerBaseline } from "@/features/program/engine/fixtures/owner"
import { draftComplete, emptyDraft, onboardingRows, stepValid, type OnboardingDraft } from "./draft"

const full: OnboardingDraft = {
  step: 6, sex: "male", birth_year: 1990, height_cm: 180, weight_kg: 82, goal: "fat", experience: "some",
  activity_level: "light", days_per_week: 3, session_min: 30,
  equipment: ["dumbbell", "band", "mat", "rope", "roller", "ball"], injuries: ["ankle"],
  test: { pushups: 12, squats: 25, plank_s: 40, ankle: ownerBaseline.ankle },
}

it("stepValid checks each step's required fields", () => {
  const d = emptyDraft()
  expect(d.equipment).toEqual(["mat"])
  expect(stepValid(d, 0)).toBe(false)
  expect(stepValid({ ...d, sex: "female", birth_year: 1995, height_cm: 165, weight_kg: 60 }, 0)).toBe(true)
  expect(stepValid({ ...d, sex: "female", birth_year: 1800, height_cm: 165, weight_kg: 60 }, 0)).toBe(false)
  expect(stepValid(d, 1)).toBe(false)
  expect(stepValid({ ...d, goal: "tone" }, 1)).toBe(true)
  expect(stepValid(d, 2)).toBe(false)
  expect(stepValid({ ...d, experience: "none", activity_level: "sedentary", days_per_week: 2, session_min: 20 }, 2)).toBe(true)
  expect(stepValid(d, 3)).toBe(true)
  expect(stepValid(d, 4)).toBe(true)
  expect(stepValid({ ...full, test: { pushups: 12, squats: 25, plank_s: 40 } }, 5)).toBe(false)
  expect(stepValid({ ...full, injuries: [], test: { pushups: 12, squats: 25, plank_s: 40 } }, 5)).toBe(true)
  expect(draftComplete(full)).toBe(true)
  expect(draftComplete({ ...full, goal: undefined })).toBe(false)
})

it("onboardingRows builds profile, metric, baseline test and an active program", () => {
  const ctx = { userId: "local", today: "2026-10-12", timezone: "Europe/Minsk", seed: "seed-1" }
  const r = onboardingRows(full, ctx, exercises)
  expect(r.profile).toEqual({ id: "local", sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk", goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light", injuries: ["ankle"], equipment: full.equipment, figure: "male" })
  expect(r.metric).toMatchObject({ date: "2026-10-12", weight_kg: 82, waist_cm: null })
  expect(r.test).toMatchObject({ date: "2026-10-12", kind: "baseline", results: full.test })
  expect(r.program.program).toMatchObject({ start_date: "2026-10-12", goal: "fat", template: "fullbody", active: true })
  expect(r.program.sessions).toHaveLength(12)
  expect(r.program.sessions[0].date).toBe("2026-10-12")
  expect(onboardingRows(full, { ...ctx, seed: "seed-1" }, exercises).program.sessions.map((s) => s.exercises)).toEqual(r.program.sessions.map((s) => s.exercises))
  expect(() => onboardingRows({ ...full, test: undefined }, ctx, exercises)).toThrow("draft incomplete")
})
