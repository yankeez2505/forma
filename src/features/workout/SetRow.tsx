import { Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PlannedExercise, SetLog } from "@/features/program/engine"
import { cn } from "@/lib/utils"

const RIRS = [0, 1, 2, 3, 4, 5]
const str = (n: number | undefined) => (n === undefined ? "" : String(n))

/** one set: reps or seconds, weight when loaded, RIR, and a "done" button; an empty field takes its placeholder */
export function SetRow({ ex, setNo, logged, onLog }: { ex: PlannedExercise; setNo: number; logged?: SetLog; onLog: (s: SetLog) => void }) {
  const timed = ex.durationS !== undefined
  const target = timed ? ex.durationS : ex.reps?.[0]
  const [count, setCount] = useState(str(timed ? logged?.durationS : logged?.reps))
  const [weight, setWeight] = useState(str(logged?.weightKg))
  const [rir, setRir] = useState(logged?.rir ?? ex.targetRir)
  const submit = () => {
    const n = count === "" ? target : Number(count)
    const s: SetLog = { slug: ex.slug, setNo, rir }
    if (timed) s.durationS = n
    else s.reps = n
    if (ex.loadKg !== undefined) s.weightKg = weight === "" ? ex.loadKg : Number(weight)
    onLog(s)
  }
  return (
    <div className={cn("grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-2 rounded-md py-1 pl-1", logged && "bg-muted/60")}>
      <span className="text-sm text-muted-foreground">{setNo}</span>
      <Input type="number" inputMode="numeric" aria-label={timed ? "Секунды" : "Повторы"} placeholder={str(target)} value={count} onChange={(e) => setCount(e.target.value)} />
      {ex.loadKg !== undefined ? (
        <Input type="number" inputMode="decimal" step="0.5" aria-label="Вес, кг" placeholder={str(ex.loadKg)} value={weight} onChange={(e) => setWeight(e.target.value)} />
      ) : (
        <span />
      )}
      <Select value={String(rir)} onValueChange={(v) => setRir(Number(v))}>
        <SelectTrigger aria-label="RIR" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RIRS.map((r) => (
            <SelectItem key={r} value={String(r)}>
              RIR {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="icon" variant={logged ? "secondary" : "default"} aria-label="Сет выполнен" onClick={submit}>
        <Check />
      </Button>
    </div>
  )
}
