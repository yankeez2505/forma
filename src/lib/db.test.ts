import { beforeEach, describe, expect, it } from "vitest"
import { emptyRows, selectRows, useDb } from "./db"

beforeEach(() => useDb.getState().replaceAll(emptyRows()))

describe("db store", () => {
  it("upsert fills user_id/timestamps and queues once", () => {
    const { upsert } = useDb.getState()
    const a = upsert("body_metrics", { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
    expect(a.user_id).toBe("local")
    expect(a.created_at).toBeTruthy()
    expect(a.updated_at).toBeTruthy()
    upsert("body_metrics", { ...a, weight_kg: 79 })
    const s = useDb.getState()
    expect(s.rows.body_metrics.m1.weight_kg).toBe(79)
    expect(s.rows.body_metrics.m1.created_at).toBe(a.created_at)
    expect(s.pending).toEqual(["body_metrics:m1"])
  })
  it("upsert keeps created_at but bumps updated_at", () => {
    const { upsert } = useDb.getState()
    const a = upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 10, squats: 20, plank_s: 40 } })
    const b = upsert("tests", { ...a, created_at: "2000-01-01T00:00:00.000Z", updated_at: "2000-01-01T00:00:00.000Z" })
    expect(b.created_at).toBe(a.created_at)
    expect(b.updated_at >= a.updated_at).toBe(true)
  })
  it("markSynced clears keys; remove deletes row and key", () => {
    useDb.getState().upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 10, squats: 20, plank_s: 40 } })
    useDb.getState().markSynced(["tests:t1"])
    expect(useDb.getState().pending).toEqual([])
    useDb.getState().remove("tests", "t1")
    expect(useDb.getState().rows.tests.t1).toBeUndefined()
    expect(useDb.getState().pending).toEqual([])
  })
  it("adoptUser rewrites user_id and requeues everything", () => {
    useDb.getState().upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 1, squats: 1, plank_s: 1 } })
    useDb.getState().markSynced(["tests:t1"])
    useDb.getState().adoptUser("uid-1")
    expect(useDb.getState().userId).toBe("uid-1")
    expect(useDb.getState().rows.tests.t1.user_id).toBe("uid-1")
    expect(useDb.getState().pending).toEqual(["tests:t1"])
  })
  it("selectRows lists rows of a table; empty store yields []", () => {
    expect(selectRows("workouts")(useDb.getState())).toEqual([])
    useDb.getState().upsert("body_metrics", { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
    expect(selectRows("body_metrics")(useDb.getState()).map((r) => r.id)).toEqual(["m1"])
  })
})

it("replaceAll resets pending unless a queue is given", () => {
  useDb.getState().upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 1, squats: 1, plank_s: 1 } })
  const rows = useDb.getState().rows
  useDb.getState().replaceAll(rows)
  expect(useDb.getState().pending).toEqual([])
  useDb.getState().replaceAll(rows, ["tests:t1"])
  expect(useDb.getState().pending).toEqual(["tests:t1"])
})

it("adoptUser re-keys the profile row to the new user id and keeps other ids", () => {
  const db = useDb.getState()
  db.replaceAll(emptyRows())
  db.upsert("profiles", { id: "local", sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk", goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light", injuries: [], equipment: ["mat"], figure: "male" })
  db.upsert("body_metrics", { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
  useDb.getState().adoptUser("11111111-2222-4333-8444-555555555555")
  const s = useDb.getState()
  expect(Object.keys(s.rows.profiles)).toEqual(["11111111-2222-4333-8444-555555555555"])
  expect(s.rows.profiles["11111111-2222-4333-8444-555555555555"].user_id).toBe("11111111-2222-4333-8444-555555555555")
  expect(s.rows.body_metrics.m1.user_id).toBe("11111111-2222-4333-8444-555555555555")
  expect(s.pending).toContain("profiles:11111111-2222-4333-8444-555555555555")
  expect(s.pending).not.toContain("profiles:local")
})
