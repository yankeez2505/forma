import { addDays, startOfWeek } from "@/lib/dates"
import type { SessionPlan } from "./types"

/** training weekdays (0 = Monday) per sessions a week: a rest day between sessions where possible */
export const WEEKDAYS: Record<2 | 3 | 4, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] }

type Dated = { date: string; week: SessionPlan["week"] }

/** week 1 is the Monday-based week of startDate, or the next one when no training day is left in it; days before startDate are dropped */
export function sessionDates(startDate: string, days: 2 | 3 | 4, weeks = 4): Dated[] {
  let monday = startOfWeek(startDate)
  if (!WEEKDAYS[days].some((d) => addDays(monday, d) >= startDate)) monday = addDays(monday, 7)
  const out: Dated[] = []
  for (let w = 0; w < weeks; w++) {
    for (const d of WEEKDAYS[days]) {
      const date = addDays(monday, w * 7 + d)
      if (date >= startDate) out.push({ date, week: (w + 1) as SessionPlan["week"] })
    }
  }
  return out
}
