import { Disclaimer } from "@/components/Disclaimer"
import { NumberField } from "@/components/NumberField"
import { Separator } from "@/components/ui/separator"
import type { TestDraft } from "./testDraft"

interface Field {
  key: keyof TestDraft
  label: string
  hint?: string
  step?: number
}
const BASE: Field[] = [
  { key: "pushups", label: "Отжимания за подход, раз", hint: "до отказа техники, с колен — если меньше 5" },
  { key: "squats", label: "Приседания за подход, раз" },
  { key: "plank_s", label: "Планка, секунд" },
]
const ANKLE: Field[] = [
  { key: "knee_to_wall_diff_cm", label: "Knee-to-wall: разница между ногами, см", step: 0.5 },
  { key: "single_leg_calf_raises", label: "Подъёмы на носок на одной ноге, раз" },
  { key: "balance_eyes_closed_s", label: "Баланс на одной ноге с закрытыми глазами, с" },
]

/** the physical test fields; the ankle block appears only for an ankle injury */
export function TestForm({ value, onChange, withAnkle }: { value: TestDraft; onChange: (v: TestDraft) => void; withAnkle: boolean }) {
  const field = (f: Field) => (
    <NumberField key={f.key} id={`test-${f.key}`} label={f.label} hint={f.hint} step={f.step} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
  )
  return (
    <div className="grid gap-4">
      {BASE.map(field)}
      {withAnkle && (
        <>
          <Separator />
          <h3 className="font-medium">Голеностоп (чекпоинт разблокировки прыжков)</h3>
          {ANKLE.map(field)}
        </>
      )}
      <Disclaimer />
    </div>
  )
}
