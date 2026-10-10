import { describe, expect, it } from "vitest"
import { all, byPattern, bySlug, filterExercises } from "./useExercises"

describe("exercise index", () => {
  it("indexes every exercise by slug", () => {
    expect(all.length).toBeGreaterThanOrEqual(83)
    expect(bySlug.get("push-up")?.name).toBe("Отжимания")
  })

  it("byPattern returns candidates ordered by difficultyRank", () => {
    expect(byPattern("squat").map((e) => e.difficultyRank)).toEqual([1, 2, 3, 4, 5])
    expect(byPattern("pull_h")[0]?.slug).toBe("prone-y-raise")
  })

  it("filterExercises matches name case-insensitively within a pattern", () => {
    expect(filterExercises(all, "ОТЖИМ", "push_h").map((e) => e.slug)).toContain("push-up")
    expect(filterExercises(all, "отжим", "squat")).toEqual([])
    expect(filterExercises(all, "  ", null)).toHaveLength(all.length)
  })
})
