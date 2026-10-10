import { ChoiceGroup } from "@/components/ChoiceGroup"
import { NumberField } from "@/components/NumberField"
import type { StepProps } from "../draft"

export function StepAbout({ d, patch }: StepProps) {
  return (
    <div className="grid gap-5">
      <ChoiceGroup value={d.sex} onChange={(sex) => patch({ sex })} columns={2} options={[{ value: "male", label: "Мужчина" }, { value: "female", label: "Женщина" }]} />
      <NumberField id="birth_year" label="Год рождения" value={d.birth_year} onChange={(birth_year) => patch({ birth_year })} placeholder="1990" />
      <NumberField id="height_cm" label="Рост, см" value={d.height_cm} onChange={(height_cm) => patch({ height_cm })} placeholder="180" />
      <NumberField id="weight_kg" label="Вес, кг" value={d.weight_kg} onChange={(weight_kg) => patch({ weight_kg })} step={0.1} placeholder="80" />
    </div>
  )
}
