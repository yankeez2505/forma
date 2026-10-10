import { describe, expect, it } from "vitest"
import { lerpPose, mirrorPose, samplePose, type Anim } from "./pose"

describe("pose math", () => {
  it("lerpPose interpolates and fills missing joints", () => {
    expect(lerpPose({ lKnee: [-20, 0, 0] }, { lKnee: [-100, 0, 0], lHip: [60, 0, 0] }, 0.5)).toEqual({
      lKnee: [-60, 0, 0],
      lHip: [30, 0, 0],
      root: { y: 0, rot: [0, 0, 0] },
    })
  })

  it("samplePose loops and eases", () => {
    const anim: Anim = {
      slug: "x",
      duration: 2,
      loop: true,
      keys: [
        { t: 0, pose: { lHip: [0, 0, 0] } },
        { t: 0.5, pose: { lHip: [90, 0, 0] } },
        { t: 1, pose: { lHip: [0, 0, 0] } },
      ],
    }
    expect(samplePose(anim, 1).lHip![0]).toBe(90)
    expect(samplePose(anim, 2).lHip![0]).toBe(0)
    expect(samplePose(anim, 0.5).lHip![0]).toBeCloseTo(45, 5)
    expect(samplePose(anim, 0.25).lHip![0]).toBeLessThan(22.5)
  })

  it("samplePose holds the last key when not looping", () => {
    const anim: Anim = { slug: "y", duration: 1, loop: false, keys: [{ t: 0, pose: {} }, { t: 1, pose: { neck: [-30, 0, 0] } }] }
    expect(samplePose(anim, 5).neck![0]).toBe(-30)
  })

  it("mirrorPose swaps sides and flips y/z", () => {
    expect(mirrorPose({ lShoulder: [30, 10, -40] })).toEqual({ rShoulder: [30, -10, 40], root: { y: 0, rot: [0, 0, 0] } })
  })
})
