import { MultiChoice } from "@/components/ChoiceGroup"
import { EQUIPMENT_RU } from "@/content/labels"
import type { EquipmentTag } from "@/lib/schema"
import type { StepProps } from "../draft"

const ALWAYS: EquipmentTag[] = ["chair", "wall"]
const options = (Object.keys(EQUIPMENT_RU) as EquipmentTag[]).filter((t) => !ALWAYS.includes(t)).map((value) => ({ value, label: EQUIPMENT_RU[value] }))

export function StepEquipment({ d, patch }: StepProps) {
  return (
    <div className="grid gap-3">
      <MultiChoice value={d.equipment} onChange={(equipment) => patch({ equipment })} options={options} />
      <p className="text-sm text-muted-foreground">Стул и стена считаются доступными всегда.</p>
    </div>
  )
}
