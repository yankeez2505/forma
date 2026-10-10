import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei"
import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ANIMS } from "@/content/anims"
import type { Sex } from "@/lib/schema"
import { BODY } from "./bodyPresets"
import { Figure } from "./Figure"

const DEFAULT_TARGET: [number, number, number] = [0, 0.9, 0]

/** Dev only: ?t=<seconds> freezes the clip at that moment for screenshots. */
function devSeek(): number | undefined {
  if (!import.meta.env.DEV) return undefined
  const t = Number(new URLSearchParams(window.location.search).get("t") ?? NaN)
  return Number.isFinite(t) ? t : undefined
}

export function ExerciseFigure({ anim: animId, figure = "male" }: { anim: string | null; figure?: Sex }) {
  const [sex, setSex] = useState<Sex>(figure)
  const [playing, setPlaying] = useState(true)
  const anim = (animId && ANIMS[animId]) || null
  const seek = devSeek()
  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Canvas camera={{ position: [1.8, 1.3, 2.6], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <Figure preset={BODY[sex]} anim={anim} playing={playing} seek={seek} />
          {anim?.prop && (
            <RoundedBox args={anim.prop.size} radius={0.02} position={anim.prop.position}>
              <meshStandardMaterial color="#a1a1aa" roughness={0.9} />
            </RoundedBox>
          )}
          <ContactShadows opacity={0.4} scale={4} blur={2.2} far={1.2} resolution={256} />
          <OrbitControls
            key={anim?.slug ?? "rest"}
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            minPolarAngle={0.9}
            maxPolarAngle={1.6}
            target={anim?.view?.target ?? DEFAULT_TARGET}
          />
        </Canvas>
        {!anim && (
          <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted-foreground">Анимация в разработке</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={playing ? "Пауза" : "Воспроизвести"}
          disabled={!anim}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <div className="ml-auto flex gap-1" role="group" aria-label="Модель">
          <Button variant={sex === "male" ? "default" : "outline"} size="sm" aria-pressed={sex === "male"} onClick={() => setSex("male")}>
            Мужчина
          </Button>
          <Button variant={sex === "female" ? "default" : "outline"} size="sm" aria-pressed={sex === "female"} onClick={() => setSex("female")}>
            Женщина
          </Button>
        </div>
      </div>
    </div>
  )
}
