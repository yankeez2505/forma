import { addDays, parseISO, startOfWeek, toISODate } from "@/lib/dates"

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
