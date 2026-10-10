import { useRef, type ReactNode, type RefObject } from "react"
import type { Group } from "three"
import { RoundedBox } from "@react-three/drei"
import type { BodyPreset } from "./bodyPresets"
import { JOINTS, type Anim, type Euler3, type Joint, type Pose } from "./pose"
import { usePosePlayer } from "./usePosePlayer"

type Vec3 = [number, number, number]
type Refs = Partial<Record<Joint | "root", Group>>
type Side = "l" | "r"
type SideProps = { side: Side; p: BodyPreset; refs: RefObject<Refs> }

const D2R = Math.PI / 180
const ZERO: Euler3 = [0, 0, 0]
const joint = (side: Side, name: string) => (side + name) as Joint

/** Writes a pose straight into the scene graph (no React re-render per frame). */
function applyPose(refs: Refs, pose: Pose, baseY: number) {
  if (refs.root) {
    const r = pose.root?.rot ?? ZERO
    refs.root.position.y = baseY + (pose.root?.y ?? 0)
    refs.root.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, "YXZ")
  }
  for (const j of JOINTS) {
    const g = refs[j]
    const e = pose[j] ?? ZERO
    if (g) g.rotation.set(e[0] * D2R, e[1] * D2R, e[2] * D2R)
  }
}

function Capsule({ r, len, color, position, rotation, scale }: { r: number; len: number; color: string; position: Vec3; rotation?: Vec3; scale?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <capsuleGeometry args={[r, len, 4, 12]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  )
}

/** Limb hanging from its joint along -Y; caps overlap the joints so bends stay round. */
const Limb = ({ r, len, color }: { r: number; len: number; color: string }) => (
  <Capsule r={r} len={Math.max(len - r, 0.01)} color={color} position={[0, -len / 2, 0]} />
)

function JointGroup({ joint: j, position, refs, children }: { joint: Joint; position: Vec3; refs: RefObject<Refs>; children: ReactNode }) {
  return (
    <group position={position} ref={(g) => { if (g) refs.current[j] = g }}>
      {children}
    </group>
  )
}

function Arm({ side, p, refs }: SideProps) {
  const s = side === "l" ? 1 : -1
  const skin = p.colors.skin
  return (
    <JointGroup joint={joint(side, "Shoulder")} position={[(s * p.shoulderW) / 2, p.torsoL - 0.35, 0]} refs={refs}>
      <Limb r={p.r.arm} len={p.upperArmL} color={skin} />
      <JointGroup joint={joint(side, "Elbow")} position={[0, -p.upperArmL, 0]} refs={refs}>
        <Limb r={p.r.forearm} len={p.forearmL} color={skin} />
        <JointGroup joint={joint(side, "Wrist")} position={[0, -p.forearmL, 0]} refs={refs}>
          <Limb r={p.r.forearm * 0.8} len={p.handL} color={skin} />
        </JointGroup>
      </JointGroup>
    </JointGroup>
  )
}

function Leg({ side, p, refs }: SideProps) {
  const s = side === "l" ? 1 : -1
  return (
    <JointGroup joint={joint(side, "Hip")} position={[(s * p.hipW) / 2, -0.02, 0]} refs={refs}>
      <Limb r={p.r.thigh} len={p.thighL} color={p.colors.bottom} />
      <JointGroup joint={joint(side, "Knee")} position={[0, -p.thighL, 0]} refs={refs}>
        <Limb r={p.r.shin} len={p.shinL} color={p.colors.skin} />
        <JointGroup joint={joint(side, "Ankle")} position={[0, -p.shinL, 0]} refs={refs}>
          <RoundedBox args={[p.r.shin * 1.7, 0.06, p.footL]} radius={0.02} position={[0, -0.03, p.footL / 2 - 0.05]}>
            <meshStandardMaterial color={p.colors.shoes} roughness={0.6} />
          </RoundedBox>
        </JointGroup>
      </JointGroup>
    </JointGroup>
  )
}

/** Capsule humanoid standing on y=0, facing +Z. Root sits at the hips. */
export function Figure({ preset: p, anim, playing, seek }: { preset: BodyPreset; anim: Anim | null; playing: boolean; seek?: number }) {
  const refs = useRef<Refs>({})
  const baseY = p.thighL + p.shinL + 0.08
  usePosePlayer(anim, playing, (pose) => applyPose(refs.current, pose, baseY), seek)
  const c = p.colors
  const chestR = p.r.torsoTop * 0.55
  const neckY = p.torsoL - 0.3
  return (
    <group ref={(g) => { if (g) refs.current.root = g }} position={[0, baseY, 0]}>
      <JointGroup joint="hips" position={[0, 0, 0]} refs={refs}>
        <Capsule r={0.1} len={p.hipW - 0.1} color={c.bottom} position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} />
        <Leg side="l" p={p} refs={refs} />
        <Leg side="r" p={p} refs={refs} />
        <JointGroup joint="spine" position={[0, 0.15, 0]} refs={refs}>
          <Capsule r={p.r.torsoBottom * 0.75} len={0.16} color={c.top} position={[0, 0.09, 0]} scale={[1.05, 1, 0.7]} />
          <JointGroup joint="chest" position={[0, 0.15, 0]} refs={refs}>
            <Capsule r={p.r.torsoTop * 0.85} len={0.06} color={c.top} position={[0, neckY - 0.2, 0]} scale={[1.2, 1, 0.72]} />
            <Capsule r={chestR} len={p.shoulderW - 2 * chestR} color={c.top} position={[0, neckY - 0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.8]} />
            <Arm side="l" p={p} refs={refs} />
            <Arm side="r" p={p} refs={refs} />
            <JointGroup joint="neck" position={[0, neckY, 0]} refs={refs}>
              <Capsule r={0.04} len={p.neckL} color={c.skin} position={[0, p.neckL / 2, 0]} />
              <JointGroup joint="head" position={[0, p.neckL, 0]} refs={refs}>
                <mesh position={[0, p.headR * 0.9, 0]}>
                  <sphereGeometry args={[p.headR, 24, 16]} />
                  <meshStandardMaterial color={c.skin} roughness={0.7} />
                </mesh>
                <mesh position={[0, p.headR * 0.95, -0.025]}>
                  <sphereGeometry args={[p.headR * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                  <meshStandardMaterial color={c.hair} roughness={0.9} />
                </mesh>
              </JointGroup>
            </JointGroup>
          </JointGroup>
        </JointGroup>
      </JointGroup>
    </group>
  )
}
