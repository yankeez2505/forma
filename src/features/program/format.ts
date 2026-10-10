import { parseISO } from "@/lib/dates"
import { WEEKDAYS } from "./engine/schedule"
import type { Block, DayType, PlannedExercise } from "./engine/types"

export const WEEKDAY_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
export const DAY_RU: Record<DayType, string> = { A: "Full-body A", B: "Full-body B", U: "Верх", L: "Низ" }
export const BLOCK_RU: Record<Block, string> = { warmup: "Разминка", main: "Основная", finisher: "Финишер", cooldown: "Заминка" }

export const fmtDate = (iso: string) => parseISO(iso).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })

export const dose = (e: PlannedExercise) =>
  e.reps ? `${e.sets}×${e.reps[0]}${e.reps[1] > e.reps[0] ? `–${e.reps[1]}` : ""}` : `${e.sets}×${e.durationS} с`

/** "Пн, Ср, Пт" */
export const trainingDays = (days: 2 | 3 | 4) => WEEKDAYS[days].map((d) => WEEKDAY_RU[d]).join(", ")
