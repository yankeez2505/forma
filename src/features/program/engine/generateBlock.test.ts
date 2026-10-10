import { expect, it } from "vitest"
import { all as exercises, bySlug } from "@/features/exercises/useExercises"
import { autoregulate } from "./autoregulate"
import { ownerBaseline, ownerConfig, ownerProfile } from "./fixtures/owner"
import { generateBlock } from "./generateBlock"
import { buildPool } from "./pool"
import { progressExercise } from "./progression"
import { deriveRestrictions } from "./restrictions"
import type { PlannedExercise, SessionPlan } from "./types"

const block = generateBlock(ownerConfig, exercises, [], 0, "prog-1")
const mainSets = (s: SessionPlan) => s.exercises.filter((e) => e.block === "main").reduce((n, e) => n + e.sets, 0)
const impact = (slug: string) => bySlug.get(slug)!.impact
const pattern = (slug: string) => bySlug.get(slug)!.pattern

it("1: no impact anywhere while the ankle is locked; block 1 adds a finisher for the fat goal", () => {
  const second = generateBlock(ownerConfig, exercises, [], 1, "prog-1")
  expect([...block, ...second].flatMap((s) => s.exercises).some((e) => impact(e.slug))).toBe(false)
  expect(second[0].exercises.some((e) => e.block === "finisher")).toBe(true)
})

it("3: weeks 1-2 at RIR 4-5; deload week has at most 60% of the sets of week 3", () => {
  for (const s of block.filter((s) => s.week <= 2)) for (const e of s.exercises) if (e.block === "main") expect(e.targetRir).toBeGreaterThanOrEqual(4)
  const sets = (w: number) => block.filter((s) => s.week === w).reduce((n, s) => n + mainSets(s), 0)
  expect(sets(4)).toBeLessThanOrEqual(Math.ceil(sets(3) * 0.6) + 1)
})

it("first block: at most 8 main sets per session, no finisher, fits 30 minutes, 12 sessions with ids", () => {
  expect(block).toHaveLength(12)
  for (const s of block) {
    expect(mainSets(s)).toBeLessThanOrEqual(8)
    expect(s.exercises.some((e) => e.block === "finisher")).toBe(false)
    expect(s.estMin).toBeLessThanOrEqual(30)
    expect(s.id).toMatch(/^[0-9a-f]{8}-/)
  }
})

it("4/5: double progression → next variation, never above 10 kg", () => {
  const pool = buildPool(exercises, ownerProfile, deriveRestrictions(ownerProfile, ownerBaseline))
  const prev: PlannedExercise = { slug: "dumbbell-squat", block: "main", sets: 3, reps: [8, 12], targetRir: 3, loadKg: 10, restS: 60 }
  const top = [1, 2, 3].map((n) => ({ slug: "dumbbell-squat", setNo: n, reps: 12, weightKg: 10 }))
  const next = progressExercise(prev, [top, top], pool.squat, bySlug.get("dumbbell-squat")!)
  expect(next.slug).toBe("plie-dumbbell-squat")
  expect(next.reps).toEqual([8, 12])
  expect(next.loadKg ?? 0).toBeLessThanOrEqual(10)
  expect(progressExercise(prev, [top], pool.squat, bySlug.get("dumbbell-squat")!)).toEqual(prev)
})

it("6: no bar → the vertical pull slot is an explicit substitution", () => {
  const b = block.find((s) => s.dayType === "B")!
  const sub = b.exercises.find((e) => e.note?.startsWith("Замена"))
  expect(sub?.slug).toBe("dumbbell-pullover")
})

it("7: A-B-A for three days a week; U-L-U-L for four", () => {
  expect(block.slice(0, 3).map((s) => s.dayType)).toEqual(["A", "B", "A"])
  const four = generateBlock({ ...ownerConfig, profile: { ...ownerProfile, days_per_week: 4 } }, exercises, [], 0, "p4")
  expect(four.slice(0, 4).map((s) => s.dayType)).toEqual(["U", "L", "U", "L"])
  expect(four.every((s) => s.estMin <= 30)).toBe(true)
})

it("8: autoregulation eases main work only when the check-in is poor", () => {
  const eased = autoregulate(block[0], { soreness: 4, sleep: 3, energy: 3 })
  for (const [i, e] of eased.exercises.entries()) {
    if (e.block !== "main") continue
    expect(e.sets).toBe(Math.max(1, block[0].exercises[i].sets - 1))
    expect(e.targetRir).toBe(block[0].exercises[i].targetRir + 1)
  }
  expect(autoregulate(block[0], { soreness: 2, sleep: 4, energy: 4 })).toEqual(block[0])
})

it("9: deterministic by seed; another seed changes picks but keeps the patterns", () => {
  expect(generateBlock(ownerConfig, exercises, [], 0, "prog-1")).toEqual(block)
  const other = generateBlock({ ...ownerConfig, seed: "owner-2" }, exercises, [], 0, "prog-1")
  const slugs = (b: SessionPlan[]) => b.flatMap((s) => s.exercises.map((e) => e.slug))
  expect(slugs(other)).not.toEqual(slugs(block))
  const patterns = (s: SessionPlan) => s.exercises.filter((e) => e.block === "main").map((e) => pattern(e.slug))
  expect(patterns(other[0])).toEqual(patterns(block[0]))
})

it("10: push-up variant follows the test for every seed; ankle warm-up opens the session", () => {
  const withPushups = (pushups: number, seed: string) => {
    const test = { ...ownerBaseline, pushups }
    return generateBlock({ ...ownerConfig, baseline: test, latestTest: test, seed }, exercises, [], 0, "p")
  }
  const pushSlug = (b: SessionPlan[]) => b[0].exercises.find((e) => e.block === "main" && pattern(e.slug) === "push_h")!.slug
  for (const seed of ["owner-1", "owner-2", "owner-3", "owner-4"]) expect(pushSlug(withPushups(3, seed))).toBe("incline-push-up")
  expect(["dumbbell-floor-press", "wide-push-up"]).toContain(pushSlug(withPushups(25, "owner-1")))
  expect(block[0].exercises.slice(0, 3).map((e) => e.slug)).toEqual(["ankle-circles", "calf-stretch-wall", "standing-calf-raise"])
})

it("history anchors picks and progresses them: two top sessions of band squats → dumbbell squats", () => {
  const top = (date: string) => ({ date, dayType: "A" as const, sets: [1, 2, 3].map((n) => ({ slug: "band-squat", setNo: n, reps: 12 })) })
  const next = generateBlock(ownerConfig, exercises, [top("2026-11-02"), top("2026-11-04")], 1, "prog-1")
  const squat = next.find((s) => s.dayType === "A")!.exercises.find((e) => e.block === "main" && pattern(e.slug) === "squat")!
  expect(squat).toMatchObject({ slug: "dumbbell-squat", reps: [8, 12], loadKg: 10 })
})

it("bodyweight only: every day still has main work and vertical push falls back to a horizontal push", () => {
  const plain = generateBlock({ ...ownerConfig, profile: { ...ownerProfile, equipment: ["mat"] } }, exercises, [], 0, "p")
  for (const s of plain) expect(mainSets(s)).toBeGreaterThan(0)
  const b = plain.find((s) => s.dayType === "B")!
  expect(b.exercises.filter((e) => e.block === "main" && pattern(e.slug) === "push_h").length).toBeGreaterThan(0)
})
