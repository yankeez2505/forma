import { parseISO } from "@/lib/dates"

/** axis label: "12 окт." (no weekday) */
export const shortDate = (iso: string) => parseISO(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
