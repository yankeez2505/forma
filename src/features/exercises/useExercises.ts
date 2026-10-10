import exercisesJson from "@/content/exercises.json"
import type { Exercise, Pattern } from "@/content/types"

export const all = exercisesJson as Exercise[]
export const bySlug = new Map(all.map((e) => [e.slug, e] as const))

const patternIndex = new Map<Pattern, Exercise[]>()
for (const e of all) {
  const list = patternIndex.get(e.pattern) ?? []
  list.push(e)
  patternIndex.set(e.pattern, list)
}
for (const list of patternIndex.values()) list.sort((a, b) => a.difficultyRank - b.difficultyRank)

export const byPattern = (pattern: Pattern): Exercise[] => patternIndex.get(pattern) ?? []

export function filterExercises(list: Exercise[], query: string, pattern: Pattern | null): Exercise[] {
  const q = query.trim().toLowerCase()
  return list.filter(
    (e) => (pattern === null || e.pattern === pattern) && (q === "" || e.name.toLowerCase().includes(q)),
  )
}

const index = { all, bySlug, byPattern }
export const useExercises = () => index
