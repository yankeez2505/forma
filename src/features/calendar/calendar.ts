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

/** planned sessions in [weekStart, weekStart + 6]: finished / total */
export function weekProgress(rows: Rows, weekStart: string): { done: number; total: number } {
  const end = addDays(weekStart, 6)
  const finished = finishedByPlanned(rows)
  const week = Object.values(rows.planned_sessions).filter((s) => s.date >= weekStart && s.date <= end)
  return { done: week.filter((s) => finished.has(s.id)).length, total: week.length }
}

/** fully completed weeks in a row, counting back from the current week (counted only once complete); a week without sessions ends the run */
export function weekStreak(rows: Rows, today: string): number {
  const current = startOfWeek(today)
  if (weekProgress(rows, current).total === 0) return 0
  const complete = (week: string) => {
    const { done, total } = weekProgress(rows, week)
    return total > 0 && done === total
  }
  let streak = 0
  for (let week = complete(current) ? current : addDays(current, -7); complete(week); week = addDays(week, -7)) streak++
  return streak
}
