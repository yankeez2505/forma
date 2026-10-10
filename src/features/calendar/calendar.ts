import { isoDate } from "@/features/program/model"
import { finishedByPlanned } from "@/features/program/programService"
import { addDays, parseISO, startOfWeek, toISODate } from "@/lib/dates"
import type { Rows } from "@/lib/db"
import type { PlannedSession, Workout } from "@/lib/schema"

export type DayStatus = "done" | "planned" | "missed" | "rest"

/** Monday-based weeks covering the month that starts at monthStart (YYYY-MM-01) */
export function monthGrid(monthStart: string): string[][] {
  const first = parseISO(monthStart)
  const last = toISODate(new Date(first.getFullYear(), first.getMonth() + 1, 0))
  const weeks: string[][] = []
  let day = startOfWeek(monthStart)
  do {
    const week: string[] = []
    for (let i = 0; i < 7; i++) {
      week.push(day)
      day = addDays(day, 1)
    }
    weeks.push(week)
  } while (weeks[weeks.length - 1][6] < last)
  return weeks
}

/** the planned session on a date (newest updated_at wins) and the finished workouts started that day */
export function daySessions(rows: Rows, date: string): { planned?: PlannedSession; workouts: Workout[] } {
  const planned = Object.values(rows.planned_sessions)
    .filter((s) => s.date === date)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const workouts = Object.values(rows.workouts)
    .filter((w) => w.finished_at !== null && isoDate(w.started_at) === date)
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
  return planned ? { planned, workouts } : { workouts }
}

/** done: a workout started that day or the day's planned session finished; planned/missed by date vs today; else rest */
export function dayStatus(rows: Rows, date: string, today: string): DayStatus {
  const { planned, workouts } = daySessions(rows, date)
  if (workouts.length > 0 || (planned !== undefined && finishedByPlanned(rows).has(planned.id))) return "done"
  if (!planned) return "rest"
  return date >= today ? "planned" : "missed"
}
