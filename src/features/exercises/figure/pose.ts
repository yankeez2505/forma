export type Joint =
  | "hips" | "spine" | "chest" | "neck" | "head"
  | "lShoulder" | "rShoulder" | "lElbow" | "rElbow" | "lWrist" | "rWrist"
  | "lHip" | "rHip" | "lKnee" | "rKnee" | "lAnkle" | "rAnkle"
/** degrees, applied in XYZ order */
export type Euler3 = [number, number, number]
export type Pose = Partial<Record<Joint, Euler3>> & { root?: { y?: number; rot?: Euler3 } }
export interface AnimKey { t: number; pose: Pose }
export interface Anim { slug: string; duration: number; loop: boolean; keys: AnimKey[] }

export const JOINTS: Joint[] = [
  "hips", "spine", "chest", "neck", "head",
  "lShoulder", "rShoulder", "lElbow", "rElbow", "lWrist", "rWrist",
  "lHip", "rHip", "lKnee", "rKnee", "lAnkle", "rAnkle",
]

const ZERO: Euler3 = [0, 0, 0]
const mix = (a: number, b: number, k: number) => a + (b - a) * k
const mixE = (a: Euler3, b: Euler3, k: number): Euler3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

/** Component-wise blend; a joint missing on one side counts as [0,0,0], root.y as 0. */
export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const out: Pose = {
    root: { y: mix(a.root?.y ?? 0, b.root?.y ?? 0, k), rot: mixE(a.root?.rot ?? ZERO, b.root?.rot ?? ZERO, k) },
  }
  for (const j of JOINTS) {
    const ea = a[j]
    const eb = b[j]
    if (ea || eb) out[j] = mixE(ea ?? ZERO, eb ?? ZERO, k)
  }
  return out
}
