import { expect, it } from "vitest"
import { mmss } from "./useCountdown"

it("mmss pads minutes and seconds", () => {
  expect(mmss(0)).toBe("00:00")
  expect(mmss(5)).toBe("00:05")
  expect(mmss(90)).toBe("01:30")
  expect(mmss(65 * 60 + 7)).toBe("65:07")
})
