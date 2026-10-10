import type { Exercise, Pattern } from "@/content/types"
import type { TestInput } from "./types"

/** starting difficultyRank per pattern from the physical test; untested patterns start at the easiest variant */
export function startRank(pattern: Pattern, test: TestInput): number {
  switch (pattern) {
    case "push_h":
      return test.pushups < 5 ? 1 : test.pushups < 15 ? 2 : 3
    case "squat":
      return test.squats < 15 ? 1 : test.squats < 30 ? 2 : 3
    case "core":
      return test.plank_s < 20 ? 1 : test.plank_s < 60 ? 4 : 6
    default:
      return 1
  }
}

/** rep range per set; under 5 push-ups starts lower */
export function startReps(pattern: Pattern, test: TestInput): [number, number] {
  return pattern === "push_h" && test.pushups < 5 ? [5, 8] : [8, 12]
}

/** seconds per set for timed exercises: plank from the test (60% of max in 5 s steps, 15-60 s), everything else 30 s */
export function startDuration(test: TestInput, slug: string): number {
  if (slug !== "plank") return 30
  return Math.min(60, Math.max(15, Math.round((test.plank_s * 0.6) / 5) * 5))
}

/** seeded choice among the first `variety` candidates at or above minRank; none that high → the hardest available */
export function pickExercise(candidates: Exercise[], minRank: number, rng: () => number, variety = 2): Exercise | undefined {
  if (candidates.length === 0) return undefined
  const eligible = candidates.filter((e) => e.difficultyRank >= minRank)
  if (eligible.length === 0) return candidates[candidates.length - 1]
  const choices = eligible.slice(0, variety)
  return choices[Math.floor(rng() * choices.length)]
}
