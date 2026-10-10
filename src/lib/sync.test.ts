import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { emptyRows, useDb } from "./db"
import { pullAll, pushPending, startSync } from "./sync"

type Call = { table: string; rows: unknown[] }
const makeFake = (opts: { fail?: boolean; server?: Record<string, unknown[]> } = {}) => {
  const calls: Call[] = []
  const client = {
    from: (table: string) => ({
      upsert: async (rows: unknown[]) => {
        calls.push({ table, rows })
        return { error: opts.fail ? { message: "x" } : null }
      },
      select: () => {
        const all = opts.server?.[table] ?? []
        const q = { order: () => q, range: async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null }) }
        return q
      },
    }),
  }
  return { calls, client: client as never }
}
const test = (id: string) => ({ id, date: "2026-10-10", kind: "baseline" as const, results: { pushups: 1, squats: 1, plank_s: 1 } })
const metric = { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null }

beforeEach(() => useDb.getState().replaceAll(emptyRows()))

describe("pushPending", () => {
  it("upserts grouped by table and clears queue", async () => {
    useDb.getState().upsert("tests", test("t1"))
    useDb.getState().upsert("tests", test("t2"))
    useDb.getState().upsert("body_metrics", metric)
    const { calls, client } = makeFake()
    const n = await pushPending(client)
    expect(n).toBe(3)
    expect(calls.map((c) => c.table).sort()).toEqual(["body_metrics", "tests"])
    expect(calls.find((c) => c.table === "tests")?.rows).toHaveLength(2)
    expect(useDb.getState().pending).toEqual([])
  })
  it("keeps queue when upsert fails", async () => {
    useDb.getState().upsert("tests", test("t1"))
    const { client } = makeFake({ fail: true })
    expect(await pushPending(client)).toBe(0)
    expect(useDb.getState().pending).toEqual(["tests:t1"])
  })
})

describe("pullAll", () => {
  it("pages through more than 1000 server rows", async () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ ...test(`t${i}`), user_id: "u", created_at: "2026-01-01T00:00:00+00:00", updated_at: "2026-01-01T00:00:00+00:00" }))
    await pullAll(makeFake({ server: { tests: many } }).client)
    expect(Object.keys(useDb.getState().rows.tests)).toHaveLength(1200)
  })
  it("newer server row wins; local-only rows stay pending", async () => {
    const local = useDb.getState().upsert("tests", test("t1"))
    useDb.getState().upsert("body_metrics", metric)
    const newer = { ...local, updated_at: "2099-01-01T00:00:00+00:00", results: { pushups: 99, squats: 1, plank_s: 1 } }
    const t9 = { ...test("t9"), user_id: "u", created_at: "2026-01-01T00:00:00+00:00", updated_at: "2026-01-01T00:00:00+00:00" }
    const { client } = makeFake({ server: { tests: [newer, t9] } })
    await pullAll(client)
    const s = useDb.getState()
    expect(s.rows.tests.t1.results.pushups).toBe(99)
    expect(s.rows.tests.t9).toBeDefined()
    expect(s.rows.body_metrics.m1).toBeDefined()
    expect(s.pending).toEqual(["body_metrics:m1"])
  })
  it("newer local row wins and stays pending", async () => {
    const local = useDb.getState().upsert("tests", test("t1"))
    const older = { ...local, updated_at: "2000-01-01T00:00:00+00:00", results: { pushups: 99, squats: 1, plank_s: 1 } }
    const { client } = makeFake({ server: { tests: [older] } })
    await pullAll(client)
    expect(useDb.getState().rows.tests.t1.results.pushups).toBe(1)
    expect(useDb.getState().pending).toEqual(["tests:t1"])
  })
})

describe("pushPending while rows change", () => {
  it("keeps a row pending when it is edited while its upsert is in flight", async () => {
    useDb.getState().upsert("tests", test("t1"))
    const client = {
      from: () => ({
        upsert: async () => {
          useDb.getState().upsert("tests", { ...test("t1"), results: { pushups: 7, squats: 1, plank_s: 1 } })
          return { error: null }
        },
      }),
    } as never
    expect(await pushPending(client)).toBe(1)
    expect(useDb.getState().pending).toEqual(["tests:t1"])
    expect(useDb.getState().rows.tests.t1.results.pushups).toBe(7)
  })
})

describe("pushPending order and errors", () => {
  const workout = { id: "w1", planned_session_id: null, started_at: "2026-10-10T18:00:00.000Z", finished_at: null, pre_soreness: null, pre_sleep: null, pre_energy: null, rpe: null, notes: null }
  const set = { id: "s1", workout_id: "w1", exercise_id: "push-up", set_no: 1, reps: 10, duration_s: null, weight_kg: null, band_kg: null, rir: null }
  it("pushes parents before children whatever the order rows were queued in", async () => {
    useDb.getState().upsert("workout_sets", set)
    useDb.getState().upsert("workouts", workout)
    const done = new Set<string>()
    const client = {
      from: (table: string) => ({
        upsert: async () => {
          if (table === "workout_sets" && !done.has("workouts")) return { error: { message: "fk" } }
          done.add(table)
          return { error: null }
        },
      }),
    } as never
    expect(await pushPending(client)).toBe(2)
    expect(useDb.getState().pending).toEqual([])
  })
  it("a failed table leaves its message in lastSyncError; the next clean pass clears it", async () => {
    useDb.getState().upsert("tests", test("t1"))
    await pushPending(makeFake({ fail: true }).client)
    expect(useDb.getState().lastSyncError).toBe("x")
    await pushPending(makeFake().client)
    expect(useDb.getState().lastSyncError).toBeNull()
  })
})

describe("startSync", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  it("retries a failed push at 2, 4, 8, 16 s and then waits for the next change", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("window", { addEventListener: () => undefined, removeEventListener: () => undefined })
    vi.stubGlobal("navigator", { onLine: true })
    useDb.getState().adoptUser("11111111-2222-4333-8444-555555555555")
    useDb.getState().upsert("tests", test("t1"))
    let calls = 0
    const client = {
      from: () => ({
        upsert: async () => {
          calls++
          return { error: { message: "x" } }
        },
      }),
    } as never
    const stop = startSync(client)
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toBe(1)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toBe(2)
    await vi.advanceTimersByTimeAsync(4_000)
    expect(calls).toBe(3)
    await vi.advanceTimersByTimeAsync(600_000)
    expect(calls).toBe(5)
    expect(useDb.getState().lastSyncError).toBe("x")
    stop()
  })
})
