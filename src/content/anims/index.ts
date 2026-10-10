import type { Anim } from "@/features/exercises/figure/pose"

const files = import.meta.glob<{ default: Anim }>("./*.json", { eager: true })

/** anim id (= file name) → clip. Files are copied here from content-src/anims by scripts/build-exercises.ts. */
export const ANIMS: Record<string, Anim> = Object.fromEntries(
  Object.values(files).map((m) => [m.default.slug, m.default]),
)
