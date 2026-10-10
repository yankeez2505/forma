import { diffDays } from "@/lib/dates"

export interface Point {
  date: string
  value: number
}

/** each point becomes the mean of the points dated within the previous windowDays (that day inclusive), 1 decimal */
export function rollingMean(points: Point[], windowDays = 7): Point[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p, i) => {
    const window = sorted.slice(0, i + 1).filter((q) => diffDays(q.date, p.date) < windowDays)
    const mean = window.reduce((sum, q) => sum + q.value, 0) / window.length
    return { date: p.date, value: Math.round(mean * 10) / 10 }
  })
}
