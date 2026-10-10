import { expect, it } from "vitest"
import { normalizeEmail, normalizeOtp } from "./email"

it("normalizeEmail trims and lowercases", () => {
  expect(normalizeEmail("  Kasatkin@Gmail.com ")).toBe("kasatkin@gmail.com")
})

it("normalizeOtp keeps digits only, max 6", () => {
  expect(normalizeOtp(" 12 34-56 ")).toBe("123456")
  expect(normalizeOtp("1234567")).toBe("123456")
})
