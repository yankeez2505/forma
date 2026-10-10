import { lazy, Suspense, useState } from "react"
import { ClipboardList, Plus, Scale } from "lucide-react"
import { Link } from "react-router"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { weekStreak } from "@/features/calendar/calendar"
import { bySlug } from "@/features/exercises/useExercises"
import { bmi } from "@/lib/calc"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { MetricsForm } from "./MetricsForm"
import { bodyFatNow, latestValue, weightTrend } from "./stats"

// recharts stays out of the main bundle
const ProgressCharts = lazy(() => import("./charts/ProgressCharts"))

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  )
}

export default function ProgressPage() {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const [open, setOpen] = useState(false)
  const profile = rows.profiles[userId]
  if (!profile) {
    return <EmptyState icon={ClipboardList} title="Сначала анкета" text="Прогресс считается от анкеты и замеров" action={<Button asChild><Link to="/onboarding">Заполнить</Link></Button>} />
  }
  const today = todayISO()
  const weight = latestValue(rows, "weight_kg")
  const mean = weightTrend(rows).mean.at(-1)
  const fat = bodyFatNow(rows, profile)
  const fatHint = profile.sex === "female" ? "нужны талия, шея и бёдра" : "нужны талия и шея"
  const addButton = (full: boolean) =>
    full ? (
      <Button onClick={() => setOpen(true)}><Plus /> Добавить замер</Button>
    ) : (
      <Button size="icon" variant="outline" aria-label="Добавить замер" onClick={() => setOpen(true)}><Plus /></Button>
    )
  return (
    <section className="grid gap-4 px-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Прогресс</h1>
          <p className="text-sm text-muted-foreground">Замеры, подходы и тесты</p>
        </div>
        {addButton(false)}
      </header>
      {weight ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Вес" value={`${weight.value} кг`} hint={mean ? `ср. 7 дн.: ${mean.value} кг` : undefined} />
          <Stat label="ИМТ" value={String(bmi(weight.value, profile.height_cm))} />
          <Stat label="% жира" value={fat === null ? "—" : `${fat} %`} hint={fat === null ? fatHint : undefined} />
          <Stat label="Стрик" value={`${weekStreak(rows, today)} нед.`} />
        </div>
      ) : (
        <EmptyState icon={Scale} title="Добавь первый замер" text="Вес — раз в неделю утром; талия и шея — для % жира" action={addButton(true)} />
      )}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <ProgressCharts rows={rows} exercises={bySlug} today={today} />
      </Suspense>
      <MetricsForm open={open} onOpenChange={setOpen} />
    </section>
  )
}
