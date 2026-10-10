import { ChoiceGroup } from "@/components/ChoiceGroup"
import { GOAL_RU } from "@/content/labels"
import type { Goal } from "@/lib/schema"
import type { StepProps } from "../draft"

const HINT: Record<Goal, string> = {
  fat: "Короткие силовые + дефицит калорий",
  muscle: "Больше подходов, профицит калорий",
  tone: "Поддержка формы и подвижность",
}
const options = (Object.keys(GOAL_RU) as Goal[]).map((value) => ({ value, label: GOAL_RU[value], hint: HINT[value] }))

export function StepGoal({ d, patch }: StepProps) {
  return <ChoiceGroup value={d.goal} onChange={(goal) => patch({ goal })} options={options} />
}
