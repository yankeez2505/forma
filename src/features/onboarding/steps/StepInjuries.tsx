import { MultiChoice } from "@/components/ChoiceGroup"
import { INJURY_RU } from "@/content/labels"
import type { InjuryTag } from "@/lib/schema"
import type { StepProps } from "../draft"

const options = (Object.keys(INJURY_RU) as InjuryTag[]).map((value) => ({ value, label: INJURY_RU[value] }))

export function StepInjuries({ d, patch }: StepProps) {
  return (
    <div className="grid gap-3">
      <MultiChoice value={d.injuries} onChange={(injuries) => patch({ injuries })} options={options} />
      <p className="text-sm text-muted-foreground">Упражнения с противопоказанием исключаются; голеностоп дополнительно блокирует прыжки до чекпоинта.</p>
    </div>
  )
}
