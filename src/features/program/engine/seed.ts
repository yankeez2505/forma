/** FNV-1a, 32 bit, unsigned */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** small seeded PRNG, uniform in [0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** stable id for a string: four salted hashes → 32 hex, with the v4 and variant bits set so Postgres accepts it as a uuid */
export function hashToUuid(s: string): string {
  const hex = [0, 1, 2, 3].map((i) => hashString(`${i}:${s}`).toString(16).padStart(8, "0")).join("")
  const variant = (8 + (parseInt(hex[16], 16) & 3)).toString(16)
  const v = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17)}`
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}`
}
