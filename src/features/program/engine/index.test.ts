import { expect, it } from "vitest"
import * as engine from "."

it("public index re-exports the engine entry points", () => {
  for (const name of ["generateBlock", "autoregulate", "progressExercise", "deriveRestrictions", "buildPool", "estimateMinutes", "hashToUuid"] as const)
    expect(typeof engine[name]).toBe("function")
  expect(engine.DUMBBELL_KG).toBe(10)
})
