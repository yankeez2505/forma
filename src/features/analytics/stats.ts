import type { Muscle } from "@/content/types"

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
