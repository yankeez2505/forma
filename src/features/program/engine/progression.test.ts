import { expect, it } from "vitest"
import { byPattern, bySlug } from "@/features/exercises/useExercises"
import { hitTop, progressExercise } from "./progression"
import type { PlannedExercise, SetLog } from "./types"

const squat = byPattern("squat").filter((e) => !e.impact)
const core = byPattern("core")
const ex = (slug: string, patch: Partial<PlannedExercise> = {}): PlannedExercise => ({ slug, block: "main", sets: 3, reps: [8, 12], targetRir: 3, restS: 60, ...patch })
const log = (slug: string, n: number, patch: Partial<SetLog>): SetLog[] => Array.from({ length: n }, (_, i) => ({ slug, setNo: i + 1, ...patch }))
const current = (slug: string) => bySlug.get(slug)!

it("hitTop: every planned set logged and each reached the top of the range (or the hold target)", () => {
  const sq = ex("dumbbell-squat", { loadKg: 10 })
  expect(hitTop(log("dumbbell-squat", 3, { reps: 12, weightKg: 10 }), sq)).toBe(true)
  expect(hitTop([...log("dumbbell-squat", 2, { reps: 12 }), { slug: "dumbbell-squat", setNo: 3, reps: 11 }], sq)).toBe(false)
  expect(hitTop(log("dumbbell-squat", 2, { reps: 12 }), sq)).toBe(false)
  expect(hitTop([], sq)).toBe(false)
  const plank = ex("plank", { reps: undefined, durationS: 25, restS: 30 })
  expect(hitTop(log("plank", 3, { durationS: 25 }), plank)).toBe(true)
  expect(hitTop(log("plank", 3, { durationS: 20 }), plank)).toBe(false)
})

it("double progression: two sessions at the top → next variation with reps back to 8-12, never above 10 kg", () => {
  const prev = ex("dumbbell-squat", { loadKg: 10 })
  const top = log("dumbbell-squat", 3, { reps: 12, weightKg: 10 })
  const next = progressExercise(prev, [top, top], squat, current("dumbbell-squat"))
  expect(next.slug).toBe("plie-dumbbell-squat")
  expect(next.reps).toEqual([8, 12])
  expect(next.loadKg).toBe(10)
  expect(progressExercise(prev, [top], squat, current("dumbbell-squat"))).toEqual(prev)
  expect(progressExercise(prev, [top, log("dumbbell-squat", 3, { reps: 10 })], squat, current("dumbbell-squat"))).toEqual(prev)
  expect(progressExercise(ex("dumbbell-squat", { loadKg: 12 }), [top], squat, current("dumbbell-squat")).loadKg).toBe(10)
})

it("variation switch adapts the fields: dumbbell → loadKg 10, bodyweight → no load, timed → 30 s hold", () => {
  const twice = (slug: string) => [log(slug, 3, { reps: 12 }), log(slug, 3, { reps: 12 })]
  expect(progressExercise(ex("band-squat"), twice("band-squat"), squat, current("band-squat"))).toMatchObject({ slug: "dumbbell-squat", loadKg: 10 })
  const toPlank = progressExercise(ex("superman"), twice("superman"), core, current("superman"))
  expect(toPlank).toMatchObject({ slug: "plank", durationS: 30, restS: 30, sets: 3 })
  expect(toPlank.reps).toBeUndefined()
  expect(toPlank.loadKg).toBeUndefined()
})

it("timed: +5 s up to 90 then the next variation; hardest variant → one more set, up to 5", () => {
  const plank = ex("plank", { reps: undefined, durationS: 25, restS: 30 })
  const hold = (s: number) => log("plank", 3, { durationS: s })
  expect(progressExercise(plank, [hold(25), hold(25)], core, current("plank"))).toMatchObject({ slug: "plank", durationS: 30 })
  const after = progressExercise({ ...plank, durationS: 90 }, [hold(90), hold(90)], core, current("plank"))
  expect(after).toMatchObject({ slug: "reverse-crunch", reps: [8, 12], restS: 60 })
  expect(after.durationS).toBeUndefined()
  const plie = ex("plie-dumbbell-squat", { loadKg: 10 })
  const top = log("plie-dumbbell-squat", 3, { reps: 12, weightKg: 10 })
  expect(progressExercise(plie, [top, top], squat, current("plie-dumbbell-squat"))).toMatchObject({ slug: "plie-dumbbell-squat", sets: 4, loadKg: 10 })
  const five = { ...plie, sets: 5 }
  const topFive = log("plie-dumbbell-squat", 5, { reps: 12 })
  expect(progressExercise(five, [topFive, topFive], squat, current("plie-dumbbell-squat"))).toEqual(five)
})
