export type Joint =
  | "hips" | "spine" | "chest" | "neck" | "head"
  | "lShoulder" | "rShoulder" | "lElbow" | "rElbow" | "lWrist" | "rWrist"
  | "lHip" | "rHip" | "lKnee" | "rKnee" | "lAnkle" | "rAnkle"
/** degrees, applied in XYZ order */
export type Euler3 = [number, number, number]
/** root.rot is [pitch, yaw, roll] in degrees, applied YXZ: pitch +90 = prone, -90 = supine */
export type Pose = Partial<Record<Joint, Euler3>> & { root?: { y?: number; rot?: Euler3 } }
export interface AnimKey { t: number; pose: Pose }
export interface Anim {
  slug: string
  duration: number
  loop: boolean
  keys: AnimKey[]
  /** optional camera aim for lying exercises */
  view?: { target: [number, number, number] }
  /** optional support box (bench, table): size and centre in metres */
  prop?: { size: [number, number, number]; position: [number, number, number] }
}

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

const smooth = (k: number) => k * k * (3 - 2 * k)

/** Pose at timeS: loops over duration (or clamps when loop=false), smoothstep between neighbouring keys. */
export function samplePose(anim: Anim, timeS: number): Pose {
  const { duration, keys } = anim
  const raw = timeS / duration
  const t = anim.loop ? raw - Math.floor(raw) : Math.min(Math.max(raw, 0), 1)
  let i = 0
  while (i < keys.length - 1 && (keys[i + 1]?.t ?? Infinity) <= t) i++
  const a = keys[i] ?? { t: 0, pose: {} }
  const b = keys[i + 1] ?? a
  const span = b.t - a.t
  const k = span > 0 ? smooth(Math.min(Math.max((t - a.t) / span, 0), 1)) : 0
  return lerpPose(a.pose, b.pose, k)
}

const SWAP: Partial<Record<Joint, Joint>> = {
  lShoulder: "rShoulder", rShoulder: "lShoulder", lElbow: "rElbow", rElbow: "lElbow", lWrist: "rWrist", rWrist: "lWrist",
  lHip: "rHip", rHip: "lHip", lKnee: "rKnee", rKnee: "lKnee", lAnkle: "rAnkle", rAnkle: "lAnkle",
}
const neg = (v: number) => (v === 0 ? 0 : -v)
const flip = (e: Euler3): Euler3 => [e[0], neg(e[1]), neg(e[2])]

/** Left/right mirror across the sagittal plane: sides swap, y/z rotations change sign. */
export function mirrorPose(p: Pose): Pose {
  const out: Pose = { root: { y: p.root?.y ?? 0, rot: flip(p.root?.rot ?? ZERO) } }
  for (const j of JOINTS) {
    const e = p[j]
    if (e) out[SWAP[j] ?? j] = flip(e)
  }
  return out
}
