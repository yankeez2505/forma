import { expect, it } from "vitest"
import { hashString, hashToUuid, mulberry32 } from "./seed"

it("hashString is FNV-1a 32-bit", () => {
  expect(hashString("")).toBe(0x811c9dc5)
  expect(hashString("a")).toBe(0xe40c292c)
})

it("mulberry32 is deterministic and stays in [0, 1)", () => {
  const a = mulberry32(hashString("x"))
  const b = mulberry32(hashString("x"))
  expect(a()).toBe(b())
  expect(a()).toBe(b())
  const r = mulberry32(7)()
  expect(r).toBeGreaterThanOrEqual(0)
  expect(r).toBeLessThan(1)
  expect(mulberry32(1)()).not.toBe(mulberry32(2)())
})

it("hashToUuid is a stable UUID-shaped id", () => {
  const id = hashToUuid("p:2026-10-12")
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(hashToUuid("p:2026-10-12")).toBe(id)
  expect(hashToUuid("p:2026-10-14")).not.toBe(id)
})
