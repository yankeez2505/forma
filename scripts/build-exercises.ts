import { access, copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { z } from "zod"
import type { EquipmentTag, InjuryTag } from "../src/lib/schema"
import type { Exercise, Muscle, Pattern } from "../src/content/types"

const DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
const ROOT = process.cwd()
const CACHE = path.join(ROOT, "content-src", ".cache")
const CURATED = path.join(ROOT, "content-src", "exercises.curated.json")
const RU = path.join(ROOT, "content-src", "exercises.ru.json")
const OUT_JSON = path.join(ROOT, "src", "content", "exercises.json")
const OUT_IMG = path.join(ROOT, "public", "ex")
const ANIMS_SRC = path.join(ROOT, "content-src", "anims")
const ANIMS_OUT = path.join(ROOT, "src", "content", "anims")
/** equipment every home has: an exercise using only these counts as bodyweight */
const HOME_FREE = new Set<EquipmentTag>(["mat", "wall", "chair"])

const PATTERNS = ["squat", "hinge", "lunge", "push_h", "push_v", "pull_h", "pull_v", "core", "calf", "mobility", "cardio", "arms", "shoulder_iso"] as const satisfies readonly Pattern[]
const EQUIPMENT = ["dumbbell", "band", "mat", "rope", "roller", "ball", "chair", "wall", "bar"] as const satisfies readonly EquipmentTag[]
const INJURIES = ["ankle", "knee", "lower_back", "shoulder", "wrist"] as const satisfies readonly InjuryTag[]
const MUSCLES = ["abdominals", "hamstrings", "adductors", "quadriceps", "biceps", "shoulders", "chest", "middle back", "calves", "glutes", "lower back", "lats", "triceps", "traps", "forearms", "neck", "abductors"] as const satisfies readonly Muscle[]

const CuratedSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab-case slug"),
  sourceId: z.string().nullable(),
  pattern: z.enum(PATTERNS),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  equipment: z.array(z.enum(EQUIPMENT)),
  impact: z.boolean(),
  contraindications: z.array(z.enum(INJURIES)),
  difficultyRank: z.number().int().positive(),
  timed: z.boolean(),
  unilateral: z.boolean(),
  anim: z.string().nullable(),
  /** only for entries without sourceId; otherwise taken from the database */
  primaryMuscles: z.array(z.enum(MUSCLES)).optional(),
  secondaryMuscles: z.array(z.enum(MUSCLES)).optional(),
})
const RuSchema = z.record(
  z.string(),
  z.object({ name: z.string().min(1), cues: z.array(z.string().min(1)).min(2), reviewed: z.boolean() }),
)
const DbSchema = z.array(
  z.object({ id: z.string(), primaryMuscles: z.array(z.enum(MUSCLES)), secondaryMuscles: z.array(z.enum(MUSCLES)), images: z.array(z.string()) }),
)
type Curated = z.infer<typeof CuratedSchema>
type DbEntry = z.infer<typeof DbSchema>[number]

const exists = (file: string) => access(file).then(() => true, () => false)

async function fetchCached(url: string, file: string): Promise<Buffer> {
  if (await exists(file)) return readFile(file)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, buf)
  return buf
}

function validate(curated: Curated[], ru: z.infer<typeof RuSchema>, db: Map<string, DbEntry>, anims: Set<string>): string[] {
  const errors: string[] = []
  const slugs = new Set<string>()
  const ranks = new Set<string>()
  for (const e of curated) {
    if (slugs.has(e.slug)) errors.push(`duplicate slug ${e.slug}`)
    slugs.add(e.slug)
    const key = `${e.pattern}:${e.difficultyRank}`
    if (ranks.has(key)) errors.push(`duplicate rank ${key} (${e.slug})`)
    ranks.add(key)
    if (!ru[e.slug]) errors.push(`missing translation ${e.slug}`)
    if (e.sourceId !== null && !db.has(e.sourceId)) errors.push(`unknown sourceId ${e.sourceId} (${e.slug})`)
    if (e.sourceId === null && !e.primaryMuscles) errors.push(`${e.slug} has no source and no primaryMuscles`)
    if (e.anim !== null && !anims.has(e.anim)) errors.push(`missing anim ${e.anim} (${e.slug})`)
  }
  return errors
}

/** anim ids with a clip in content-src/anims; a clip's slug must equal its file name (index.ts keys by slug) */
async function readAnims(): Promise<{ ids: Set<string>; errors: string[] }> {
  const ids = new Set<string>()
  const errors: string[] = []
  for (const file of (await readdir(ANIMS_SRC)).filter((f) => f.endsWith(".json"))) {
    const id = file.slice(0, -5)
    const clip = JSON.parse(await readFile(path.join(ANIMS_SRC, file), "utf8")) as { slug?: unknown }
    if (clip.slug !== id) errors.push(`anim ${file} has slug ${String(clip.slug)}`)
    ids.add(id)
  }
  return { ids, errors }
}

async function copyAnims(ids: Set<string>) {
  await mkdir(ANIMS_OUT, { recursive: true })
  for (const id of ids) await copyFile(path.join(ANIMS_SRC, `${id}.json`), path.join(ANIMS_OUT, `${id}.json`))
}

async function buildImages(slug: string, src: DbEntry | undefined): Promise<string[]> {
  if (!src) return []
  const out: string[] = []
  for (const [i, img] of src.images.slice(0, 2).entries()) {
    const target = path.join(OUT_IMG, slug, `${i}.webp`)
    if (!(await exists(target))) {
      const buf = await fetchCached(IMG_BASE + img, path.join(CACHE, "img", img))
      await mkdir(path.dirname(target), { recursive: true })
      await sharp(buf).resize({ width: 600 }).webp({ quality: 75 }).toFile(target)
    }
    out.push(`ex/${slug}/${i}.webp`)
  }
  return out
}

function report(all: Exercise[]) {
  const bodyweight = (e: Exercise) => e.equipment.every((t) => HOME_FREE.has(t))
  const thin = PATTERNS.filter((p) => all.filter((e) => e.pattern === p && bodyweight(e)).length < 2)
  console.log(`exercises: ${all.length}, images: ${all.reduce((n, e) => n + e.images.length, 0)}, anims: ${all.filter((e) => e.anim !== null).length}`)
  console.log(`unreviewed translations: ${all.filter((e) => !e.reviewed).length}`)
  console.log(`patterns with <2 bodyweight candidates: ${thin.join(", ") || "none"}`)
}

async function main() {
  const dbRaw = await fetchCached(DB_URL, path.join(CACHE, "exercises.json"))
  const db = new Map(DbSchema.parse(JSON.parse(dbRaw.toString("utf8"))).map((e) => [e.id, e]))
  const curated = z.array(CuratedSchema).parse(JSON.parse(await readFile(CURATED, "utf8")))
  const ru = RuSchema.parse(JSON.parse(await readFile(RU, "utf8")))
  const anims = await readAnims()
  const errors = [...anims.errors, ...validate(curated, ru, db, anims.ids)]
  if (errors.length) {
    console.error(errors.join("\n"))
    process.exit(1)
  }
  await copyAnims(anims.ids)
  const all: Exercise[] = []
  for (const { primaryMuscles, secondaryMuscles, ...e } of curated) {
    const src = e.sourceId ? db.get(e.sourceId) : undefined
    const t = ru[e.slug]
    all.push({
      ...e,
      primaryMuscles: src?.primaryMuscles ?? primaryMuscles ?? [],
      secondaryMuscles: src?.secondaryMuscles ?? secondaryMuscles ?? [],
      images: await buildImages(e.slug, src),
      name: t.name,
      cues: t.cues,
      reviewed: t.reviewed,
    })
  }
  all.sort((a, b) => (a.slug < b.slug ? -1 : 1))
  await writeFile(OUT_JSON, "[\n" + all.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n")
  report(all)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
