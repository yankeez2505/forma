import type { Sex } from "@/lib/schema"

/** Segment lengths in metres, radii for the capsules, palette per preset. */
export interface BodyPreset {
  headR: number
  neckL: number
  torsoL: number
  shoulderW: number
  hipW: number
  upperArmL: number
  forearmL: number
  handL: number
  thighL: number
  shinL: number
  footL: number
  r: { arm: number; forearm: number; thigh: number; shin: number; torsoTop: number; torsoBottom: number }
  colors: { skin: string; top: string; bottom: string; shoes: string; hair: string }
}

export const BODY: Record<Sex, BodyPreset> = {
  male: {
    headR: 0.11, neckL: 0.07, torsoL: 0.55, shoulderW: 0.42, hipW: 0.3,
    upperArmL: 0.3, forearmL: 0.27, handL: 0.1, thighL: 0.45, shinL: 0.43, footL: 0.25,
    r: { arm: 0.055, forearm: 0.045, thigh: 0.085, shin: 0.06, torsoTop: 0.17, torsoBottom: 0.14 },
    colors: { skin: "#d9a47a", top: "#1f2937", bottom: "#111827", shoes: "#f4f4f5", hair: "#2b1d12" },
  },
  female: {
    headR: 0.1, neckL: 0.065, torsoL: 0.5, shoulderW: 0.36, hipW: 0.33,
    upperArmL: 0.28, forearmL: 0.25, handL: 0.09, thighL: 0.43, shinL: 0.41, footL: 0.23,
    r: { arm: 0.045, forearm: 0.038, thigh: 0.08, shin: 0.052, torsoTop: 0.145, torsoBottom: 0.15 },
    colors: { skin: "#e3b08a", top: "#a3e635", bottom: "#1f2937", shoes: "#f4f4f5", hair: "#3b2a1a" },
  },
}
