import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Exercise } from "@/content/types"
import { startOfWeek } from "@/lib/dates"
import type { Rows } from "@/lib/db"
import { GROUP_RU, planVsFact, testSeries, weeklySetsByGroup, weightTrend, type MuscleGroup } from "../stats"
import { PlanFactChart } from "./PlanFactChart"
import { SetsChart } from "./SetsChart"
import { TestChart } from "./TestChart"
import { WeightChart } from "./WeightChart"

function ChartCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const Note = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>

/** the four progress charts; loaded lazily so recharts stays out of the main bundle */
export default function ProgressCharts({ rows, exercises, today }: { rows: Rows; exercises: Map<string, Exercise>; today: string }) {
  const { raw, mean } = weightTrend(rows)
  const week = weeklySetsByGroup(rows, exercises, startOfWeek(today))
  const sets = (Object.keys(week) as MuscleGroup[])
    .filter((g) => week[g] > 0)
    .map((g) => ({ group: GROUP_RU[g], sets: week[g] }))
    .sort((a, b) => b.sets - a.sets)
  const weeks = planVsFact(rows, today)
  const tests = testSeries(rows)
  return (
    <>
      <ChartCard title="Вес" hint="Точки — замеры, линия — среднее за 7 дней">
        {raw.length < 2 ? <Note>Нужно ≥2 замера</Note> : <WeightChart raw={raw} mean={mean} />}
      </ChartCard>
      <ChartCard title="Подходы за неделю" hint="По группам мышц, с понедельника">
        {sets.length === 0 ? <Note>Пока нет тренировок на этой неделе</Note> : <SetsChart data={sets} />}
      </ChartCard>
      <ChartCard title="План и факт" hint="Тренировок в неделю за последние 8 недель">
        {weeks.every((w) => w.planned === 0 && w.done === 0) ? <Note>Пока нет тренировок</Note> : <PlanFactChart data={weeks} />}
      </ChartCard>
      <ChartCard title="Тесты" hint="Отжимания, приседания и планка">
        {tests.length < 2 ? <Note>{tests.length === 0 ? "Нет тестов" : "Второй тест появится на чекпоинте"}</Note> : <TestChart data={tests} />}
      </ChartCard>
    </>
  )
}
