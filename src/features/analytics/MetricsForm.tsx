import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { metricId } from "@/features/program/model"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { mergeMetric, type MetricKey } from "./stats"

const FIELDS: { key: MetricKey; label: string; step: string }[] = [
  { key: "weight_kg", label: "Вес, кг", step: "0.1" },
  { key: "waist_cm", label: "Талия, см", step: "0.5" },
  { key: "neck_cm", label: "Шея, см", step: "0.5" },
  { key: "hip_cm", label: "Бёдра, см", step: "0.5" },
]

type Edits = Partial<Record<MetricKey, string>>

const parseNum = (s: string): number | null => {
  const n = Number(s.replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** measurement drawer for one date; fields left empty keep the values already stored for that date */
export function MetricsForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const upsert = useDb((s) => s.upsert)
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [edits, setEdits] = useState<Edits>({})
  const existing = rows.body_metrics[metricId(userId, date)]
  const female = rows.profiles[userId]?.sex === "female"
  const fields = female ? FIELDS : FIELDS.filter((f) => f.key !== "hip_cm")

  const stored = (key: MetricKey) => {
    const v = existing?.[key]
    return v === null || v === undefined ? "" : String(v)
  }
  const patch: Partial<Record<MetricKey, number>> = {}
  let invalid = false
  for (const f of fields) {
    const raw = edits[f.key]
    if (raw === undefined || raw.trim() === "") continue
    const n = parseNum(raw)
    if (n === null) invalid = true
    else patch[f.key] = n
  }
  const canSave = !invalid && Object.keys(patch).length > 0

  const close = () => {
    setEdits({})
    setDate(todayISO())
    onOpenChange(false)
  }
  const save = () => {
    upsert("body_metrics", mergeMetric(existing, patch, userId, date))
    toast.success("Замер сохранён")
    close()
  }
  return (
    <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Замер</DrawerTitle>
          <DrawerDescription>Вес — утром натощак. Талия и шея{female ? ", бёдра" : ""} нужны для % жира</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 px-4">
          <div className="grid gap-1.5">
            <Label htmlFor="metric-date">Дата</Label>
            <Input
              id="metric-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                setDate(e.target.value)
                setEdits({})
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={`metric-${f.key}`}>{f.label}</Label>
                <Input
                  id={`metric-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  min="0"
                  value={edits[f.key] ?? stored(f.key)}
                  onChange={(e) => setEdits({ ...edits, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        <DrawerFooter>
          <Button type="button" size="lg" disabled={!canSave} onClick={save}>
            Сохранить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
