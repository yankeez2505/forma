import { useMemo } from "react"
import { Disclaimer } from "@/components/Disclaimer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GOAL_RU } from "@/content/labels"
import { all as exercises } from "@/features/exercises/useExercises"
import { fmtDate, trainingDays } from "@/features/program/format"
import { todayISO } from "@/lib/dates"
import { draftComplete, onboardingRows, type StepProps } from "../draft"

export function StepSummary({ d }: StepProps) {
  const first = useMemo(() => {
    if (!draftComplete(d)) return undefined
    const ctx = { userId: "preview", today: todayISO(), timezone: "UTC", seed: "preview" }
    return onboardingRows(d, ctx, exercises).program.sessions[0]?.date
  }, [d])
  if (!d.goal || !d.days_per_week || !d.session_min) return null
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Твоя программа</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>Цель: {GOAL_RU[d.goal]}</p>
          <p>{d.days_per_week} дня в неделю — {trainingDays(d.days_per_week)}, по {d.session_min} мин</p>
          {first && <p>Первая тренировка: {fmtDate(first)}</p>}
          <p className="text-muted-foreground">Недели 1–2 — лёгкие по ощущениям (RIR 4–5): так ты не сорвёшься на крепатуре.</p>
          {d.injuries.includes("ankle") && <p className="text-muted-foreground">Прыжки и скакалка появятся после чекпоинта.</p>}
        </CardContent>
      </Card>
      <Disclaimer />
    </div>
  )
}
