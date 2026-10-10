import { useState } from "react"
import { Rating } from "@/components/Rating"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { needsEasing, type CheckIn, type SessionPlan } from "@/features/program/engine"
import { ResumeDialog } from "@/features/workout/ResumeDialog"
import { useStartWorkout } from "@/features/workout/useStartWorkout"

const FIELDS: { key: keyof CheckIn; label: string; labels: [string, string] }[] = [
  { key: "soreness", label: "Крепатура / боль", labels: ["нет", "сильная"] },
  { key: "sleep", label: "Сон", labels: ["плохо", "отлично"] },
  { key: "energy", label: "Энергия", labels: ["нет сил", "полон сил"] },
]

const complete = (v: Partial<CheckIn>): CheckIn | null =>
  v.soreness !== undefined && v.sleep !== undefined && v.energy !== undefined ? { soreness: v.soreness, sleep: v.sleep, energy: v.energy } : null

/** pre-session check-in (1–5 ×3); "Начать" needs all three, skipping starts the session as planned */
export function CheckInSheet({ plan, open, onOpenChange }: { plan: SessionPlan | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [v, setV] = useState<Partial<CheckIn>>({})
  const { start, conflict, continueActive, abortActive, dismiss } = useStartWorkout()
  const checkIn = complete(v)
  const go = (c: CheckIn | null) => {
    if (!plan) return
    onOpenChange(false)
    start(plan.id, c)
  }
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Как самочувствие?</DrawerTitle>
            <DrawerDescription>По оценкам тренировка подстроится под сегодняшний день</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-4 px-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <p className="text-sm font-medium">{f.label}</p>
                <Rating value={v[f.key]} onChange={(n) => setV({ ...v, [f.key]: n })} labels={f.labels} />
              </div>
            ))}
            <p className="min-h-5 text-sm text-muted-foreground">{checkIn && needsEasing(checkIn) ? "Сегодня облегчим: на сет меньше, RIR +1" : ""}</p>
          </div>
          <DrawerFooter>
            <Button type="button" size="lg" disabled={!checkIn} onClick={() => go(checkIn)}>
              Начать
            </Button>
            <Button type="button" variant="ghost" onClick={() => go(null)}>
              Пропустить чек-ин
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <ResumeDialog conflict={conflict} onContinue={continueActive} onAbort={abortActive} onClose={dismiss} />
    </>
  )
}
