import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { bySlug } from "@/features/exercises/useExercises"
import { fmtDate } from "@/features/program/format"
import { isoDate, toSessionPlan } from "@/features/program/model"
import { finishedByPlanned } from "@/features/program/programService"
import { CheckInSheet } from "@/features/today/CheckInSheet"
import { SessionCard } from "@/features/today/SessionCard"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { daySessions, workoutSummary, type WorkoutSummary } from "./calendar"

type SetRow = WorkoutSummary["sets"][number]

const name = (slug: string) => bySlug.get(slug)?.name ?? slug
const setText = (s: SetRow) => {
  const dose = s.reps !== null ? `${s.reps}` : s.durationS !== null ? `${s.durationS} с` : "—"
  return s.weightKg !== null ? `${dose} × ${s.weightKg} кг` : dose
}
/** sets arrive grouped by exercise; collapse each group into one row of doses */
const groups = (sets: SetRow[]) =>
  sets.reduce<{ slug: string; doses: string[] }[]>((acc, s) => {
    const last = acc[acc.length - 1]
    if (last && last.slug === s.slug) last.doses.push(setText(s))
    else acc.push({ slug: s.slug, doses: [setText(s)] })
    return acc
  }, [])

function WorkoutBlock({ summary, date }: { summary: WorkoutSummary; date: string }) {
  const started = isoDate(summary.startedAt)
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        {started !== date ? `${fmtDate(started)} · ` : ""}
        {summary.durationMin !== null ? `${summary.durationMin} мин` : "—"} · RPE {summary.rpe ?? "—"}
      </p>
      <ul className="divide-y text-sm">
        {groups(summary.sets).map((g) => (
          <li key={g.slug} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="min-w-0 font-medium">{name(g.slug)}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{g.doses.join(" · ")}</span>
          </li>
        ))}
      </ul>
      {summary.notes && <p className="text-sm">{summary.notes}</p>}
    </div>
  )
}

/** what happened (or is planned) on one calendar day; a past/today planned session can be started from here */
export function DaySheet({ date, open, onOpenChange }: { date: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const rows = useDb((s) => s.rows)
  const [checkIn, setCheckIn] = useState(false)
  const { planned, workouts } = date ? daySessions(rows, date) : { planned: undefined, workouts: [] }
  const finished = planned ? finishedByPlanned(rows).get(planned.id) : undefined
  const shown = finished && !workouts.some((w) => w.id === finished.id) ? [...workouts, finished] : workouts
  const plan = planned ? toSessionPlan(planned) : null
  const canStart = date !== null && date <= todayISO()
  const startThis = () => {
    onOpenChange(false)
    setCheckIn(true)
  }
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{date ? fmtDate(date) : ""}</DrawerTitle>
            <DrawerDescription>{shown.length > 0 ? "Сделано" : plan ? "Запланировано" : "Отдых"}</DrawerDescription>
          </DrawerHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto px-4 pb-6">
            {date &&
              shown.map((w) => {
                const summary = workoutSummary(rows, w.id)
                return summary && <WorkoutBlock key={w.id} summary={summary} date={date} />
              })}
            {plan && !finished && (
              <SessionCard
                plan={plan}
                action={
                  canStart ? (
                    <Button type="button" className="w-full" onClick={startThis}>
                      Начать эту тренировку
                    </Button>
                  ) : undefined
                }
              />
            )}
            {shown.length === 0 && !plan && <p className="text-sm text-muted-foreground">Отдых</p>}
          </div>
        </DrawerContent>
      </Drawer>
      <CheckInSheet plan={plan} open={checkIn} onOpenChange={setCheckIn} />
    </>
  )
}
