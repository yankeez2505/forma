import type { Profile } from "@/lib/schema"

/** profile fields the program engine reads */
export const PROGRAM_FIELDS = ["goal", "experience", "days_per_week", "session_min", "injuries", "equipment"] as const

const key = (v: Profile[(typeof PROGRAM_FIELDS)[number]]) => (Array.isArray(v) ? [...v].sort().join(",") : String(v))

/** true when any program field differs between two profiles (arrays compared as sets) */
export const programAffected = (a: Profile, b: Profile): boolean => PROGRAM_FIELDS.some((k) => key(a[k]) !== key(b[k]))
