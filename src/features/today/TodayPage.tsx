import { ClipboardList, Dumbbell, Flag, Moon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router"
import { Disclaimer } from "@/components/Disclaimer"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DAY_RU, fmtDate } from "@/features/program/format"
import { isoDate } from "@/features/program/model"
import { progress, useActiveWorkout } from "@/features/workout/activeWorkout"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import type { Workout } from "@/lib/schema"
import { CheckInSheet } from "./CheckInSheet"
import { SessionCard } from "./SessionCard"
import { todayState, type TodayState } from "./todayState"

const link = (to: string, text: string) => (
  <Button asChild>
    <Link to={to}>{text}</Link>
  </Button>
)
const minutes = (w: Workout) => (w.finished_at ? Math.max(1, Math.round((Date.parse(w.finished_at) - Date.parse(w.started_at)) / 60_000)) : null)

export default function TodayPage() {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const draft = useActiveWorkout((s) => s.draft)
  const today = todayISO()
  const st = useMemo(() => todayState(rows, userId, draft, today), [rows, userId, draft, today])
  const [checkIn, setCheckIn] = useState(false)
  return (
    <section className="grid gap-4 px-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Сегодня</h1>
        <p className="text-sm text-muted-foreground">{fmtDate(today)}</p>
      </header>
      <Body st={st} openCheckIn={() => setCheckIn(true)} />
      {(st.kind === "session" || st.kind === "missed") && <CheckInSheet plan={st.plan} open={checkIn} onOpenChange={setCheckIn} />}
    </section>
  )
}

function Body({ st, openCheckIn }: { st: TodayState; openCheckIn: () => void }) {
  switch (st.kind) {
    case "noProfile":
      return <EmptyState icon={ClipboardList} title="Начнём с анкеты" text="5 минут: цель, режим, инвентарь и короткий тест" action={link("/onboarding", "Заполнить анкету")} />
    case "resume":
      return (
        <Card>
          <CardHeader>
            <CardTitle>Тренировка не закончена</CardTitle>
            <CardDescription>
              {fmtDate(isoDate(st.draft.startedAt))} · {progress(st.draft).done} сетов
            </CardDescription>
          </CardHeader>
          <CardFooter>{link(`/workout/${st.draft.workoutId}`, "Продолжить")}</CardFooter>
        </Card>
      )
    case "noProgram":
      return <EmptyState icon={Dumbbell} title="Программы пока нет" action={link("/checkpoint", "Пройти тест и собрать программу")} />
    case "session":
      return (
        <>
          <SessionCard
            plan={st.plan}
            action={
              <Button type="button" size="lg" className="w-full" onClick={openCheckIn}>
                Начать тренировку
              </Button>
            }
          />
          <Disclaimer />
        </>
      )
    case "done": {
      const m = minutes(st.workout)
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Сделано ✓</CardTitle>
              <CardDescription>
                {DAY_RU[st.plan.dayType]} · {fmtDate(st.plan.date)} · RPE {st.workout.rpe ?? "—"}
                {m ? ` · ${m} мин` : ""}
              </CardDescription>
            </CardHeader>
          </Card>
          {st.next ? (
            <p className="text-sm text-muted-foreground">
              Следующая: {fmtDate(st.next.date)} · {DAY_RU[st.next.dayType]}
            </p>
          ) : (
            link("/checkpoint", "Блок завершён — пройти чекпоинт")
          )}
        </>
      )
    }
    case "blockDone":
      return <EmptyState icon={Flag} title="Блок из 4 недель завершён" text="Повтори тест — по нему соберётся следующий блок" action={link("/checkpoint", "Чекпоинт")} />
    case "missed":
      return (
        <>
          <SessionCard
            plan={st.plan}
            title={`Пропущена: ${DAY_RU[st.plan.dayType]}`}
            action={
              <Button type="button" className="w-full" onClick={openCheckIn}>
                Сделать сегодня
              </Button>
            }
          />
          {st.next && <p className="text-sm text-muted-foreground">Или дождись следующей: {fmtDate(st.next.date)}</p>}
        </>
      )
    case "rest":
      return (
        <>
          <EmptyState icon={Moon} title="День отдыха" text={st.next ? `Следующая тренировка: ${fmtDate(st.next.date)} · ${DAY_RU[st.next.dayType]}` : undefined} />
          {st.next && <SessionCard plan={st.next} title="Следующая" />}
        </>
      )
  }
}
