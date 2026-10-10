import { useState } from "react"
import { toast } from "sonner"
import { ChoiceGroup, MultiChoice } from "@/components/ChoiceGroup"
import { NumberField } from "@/components/NumberField"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ACTIVITY_RU, EQUIPMENT_RU, EXPERIENCE_RU, GOAL_RU, INJURY_RU } from "@/content/labels"
import { trainingDays } from "@/features/program/format"
import { useDb } from "@/lib/db"
import type { Profile } from "@/lib/schema"

type Draft = Omit<Profile, "birth_year" | "height_cm"> & { birth_year?: number; height_cm?: number }
const options = <T extends string>(r: Record<T, string>) => (Object.keys(r) as T[]).map((value) => ({ value, label: r[value] }))
const GOALS = options(GOAL_RU)
const EXPERIENCE = options(EXPERIENCE_RU)
const ACTIVITY = options(ACTIVITY_RU)
const INJURIES = options(INJURY_RU)
const EQUIPMENT = options(EQUIPMENT_RU).filter((o) => o.value !== "chair" && o.value !== "wall")
const DAYS = ([2, 3, 4] as const).map((value) => ({ value, label: `${value} дня`, hint: trainingDays(value) }))
const MINUTES = ([20, 30, 45] as const).map((value) => ({ value, label: `${value} мин` }))
const within = (n: number | undefined, min: number, max: number): n is number => n !== undefined && n >= min && n <= max

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** the editable copy lives only while the drawer is open, so every opening starts from the saved profile */
function Fields({ profile, onSaved, onClose }: { profile: Profile; onSaved: (next: Profile) => void; onClose: () => void }) {
  const upsert = useDb((s) => s.upsert)
  const [d, setD] = useState<Draft>(profile)
  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }))
  const valid = within(d.birth_year, 1920, 2020) && within(d.height_cm, 120, 230)
  const save = () => {
    if (!within(d.birth_year, 1920, 2020) || !within(d.height_cm, 120, 230)) return
    const next: Profile = { ...d, birth_year: d.birth_year, height_cm: d.height_cm }
    upsert("profiles", { ...next, id: profile.id })
    onSaved(next)
    toast.success("Анкета обновлена")
    onClose()
  }
  return (
    <div className="grid min-h-0 gap-5 overflow-y-auto px-4 pb-6">
      <ChoiceGroup value={d.sex} onChange={(sex) => patch({ sex, figure: sex })} columns={2} options={[{ value: "male", label: "Мужчина" }, { value: "female", label: "Женщина" }]} />
      <NumberField id="pf-birth-year" label="Год рождения" value={d.birth_year} onChange={(birth_year) => patch({ birth_year })} placeholder="1990" />
      <NumberField id="pf-height" label="Рост, см" value={d.height_cm} onChange={(height_cm) => patch({ height_cm })} placeholder="180" />
      <Section title="Цель">
        <ChoiceGroup value={d.goal} onChange={(goal) => patch({ goal })} options={GOALS} />
      </Section>
      <Section title="Опыт тренировок">
        <ChoiceGroup value={d.experience} onChange={(experience) => patch({ experience })} options={EXPERIENCE} />
      </Section>
      <Section title="Активность вне тренировок">
        <ChoiceGroup value={d.activity_level} onChange={(activity_level) => patch({ activity_level })} options={ACTIVITY} />
      </Section>
      <Section title="Тренировок в неделю">
        <ChoiceGroup value={d.days_per_week} onChange={(days_per_week) => patch({ days_per_week })} options={DAYS} columns={3} />
      </Section>
      <Section title="Длительность">
        <ChoiceGroup value={d.session_min} onChange={(session_min) => patch({ session_min })} options={MINUTES} columns={3} />
      </Section>
      <Section title="Инвентарь">
        <MultiChoice value={d.equipment} onChange={(equipment) => patch({ equipment })} options={EQUIPMENT} />
      </Section>
      <Section title="Травмы и ограничения">
        <MultiChoice value={d.injuries} onChange={(injuries) => patch({ injuries })} options={INJURIES} />
      </Section>
      <Button size="lg" disabled={!valid} onClick={save}>
        Сохранить
      </Button>
    </div>
  )
}

export function ProfileForm({ profile, open, onOpenChange, onSaved }: { profile: Profile; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (next: Profile) => void }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Анкета</DrawerTitle>
          <DrawerDescription>Смена цели, режима, инвентаря или травм предложит пересобрать программу</DrawerDescription>
        </DrawerHeader>
        {open && <Fields profile={profile} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  )
}
