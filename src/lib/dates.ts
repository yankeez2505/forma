// Все даты — строки YYYY-MM-DD в локальной зоне. Никогда `new Date(iso)` (это UTC).

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const todayISO = (now = new Date()) => toISODate(now)

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 0 = понедельник … 6 = воскресенье */
export const weekday = (iso: string) => (parseISO(iso).getDay() + 6) % 7

export const startOfWeek = (iso: string) => addDays(iso, -weekday(iso))

export const diffDays = (a: string, b: string) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
