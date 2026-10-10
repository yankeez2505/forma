import { expect, it } from "vitest"
import { newId } from "./id"

it("newId returns a uuid v4 and is unique", () => {
  const a = newId()
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(newId()).not.toBe(a)
})
