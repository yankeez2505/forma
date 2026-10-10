import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { samplePose, type Anim, type Pose } from "./pose"

const REST: Pose = {}

/**
 * Advances the clip while `playing` and hands each frame's pose to `apply`.
 * Imperative on purpose: writing rotations straight into the scene graph avoids
 * a React re-render per frame. `seek` (seconds) pins the clip to one moment.
 */
export function usePosePlayer(anim: Anim | null, playing: boolean, apply: (pose: Pose) => void, seek?: number) {
  const time = useRef(0)
  const slug = useRef<string | null>(null)
  useFrame((_, delta) => {
    const next = anim?.slug ?? null
    if (next !== slug.current) {
      slug.current = next
      time.current = 0
    }
    if (seek !== undefined) time.current = seek
    else if (playing) time.current += Math.min(delta, 0.1)
    apply(anim ? samplePose(anim, time.current) : REST)
  })
}
