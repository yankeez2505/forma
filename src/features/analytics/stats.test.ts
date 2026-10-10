import { expect, it } from "vitest"
import { all as exercises } from "@/features/exercises/useExercises"
import { GROUP_RU, MUSCLE_GROUP } from "./stats"

it("every muscle maps to a labelled group and every exercise's muscles are covered", () => {
  expect(Object.keys(MUSCLE_GROUP)).toHaveLength(17)
  expect(new Set(Object.values(MUSCLE_GROUP))).toEqual(new Set(Object.keys(GROUP_RU)))
  expect(exercises.every((e) => [...e.primaryMuscles, ...e.secondaryMuscles].every((m) => m in MUSCLE_GROUP))).toBe(true)
})
