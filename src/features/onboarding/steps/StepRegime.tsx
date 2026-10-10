import { ChoiceGroup } from "@/components/ChoiceGroup"
import { ACTIVITY_RU, EXPERIENCE_RU } from "@/content/labels"
import { trainingDays } from "@/features/program/format"
import type { ActivityLevel, Experience } from "@/lib/schema"
import type { OnboardingDraft, StepProps } from "../draft"

const ACTIVITY_HINT: Record<ActivityLevel, string> = {
  sedentary: "офис, мало ходьбы",
  light: "прогулки, 1–2 активности",
  moderate: "на ногах полдня",
  high: "физический труд",
}
const experience = (Object.keys(EXPERIENCE_RU) as Experience[]).map((value) => ({ value, label: EXPERIENCE_RU[value] }))
const activity = (Object.keys(ACTIVITY_RU) as ActivityLevel[]).map((value) => ({ value, label: ACTIVITY_RU[value], hint: ACTIVITY_HINT[value] }))
const days = ([2, 3, 4] as const).map((value) => ({ value, label: `${value} дня`, hint: trainingDays(value) }))
const minutes = ([20, 30, 45] as const).map((value) => ({ value, label: `${value} мин` }))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function StepRegime({ d, patch }: StepProps) {
  const set = <K extends keyof OnboardingDraft>(key: K) => (v: OnboardingDraft[K]) => patch({ [key]: v } as Partial<OnboardingDraft>)
  return (
    <div className="grid gap-5">
      <Section title="Опыт тренировок">
        <ChoiceGroup value={d.experience} onChange={set("experience")} options={experience} />
      </Section>
      <Section title="Активность вне тренировок">
        <ChoiceGroup value={d.activity_level} onChange={set("activity_level")} options={activity} />
      </Section>
      <Section title="Тренировок в неделю">
        <ChoiceGroup value={d.days_per_week} onChange={set("days_per_week")} options={days} columns={3} />
      </Section>
      <Section title="Длительность">
        <ChoiceGroup value={d.session_min} onChange={set("session_min")} options={minutes} columns={3} />
      </Section>
    </div>
  )
}
