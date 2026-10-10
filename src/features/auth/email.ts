export const normalizeEmail = (s: string) => s.trim().toLowerCase()
export const normalizeOtp = (s: string) => s.replace(/\D/g, "").slice(0, 6)
