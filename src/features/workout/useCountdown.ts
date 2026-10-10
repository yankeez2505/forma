import { useEffect, useState } from "react"

/** Date.now() that ticks */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** seconds left until an epoch-ms deadline, 0 when none */
export function useCountdown(until: number | null): number {
  const now = useNow(250)
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
}

/** 90 → "01:30"; minutes are not capped */
export const mmss = (totalS: number) => `${String(Math.floor(totalS / 60)).padStart(2, "0")}:${String(totalS % 60).padStart(2, "0")}`
