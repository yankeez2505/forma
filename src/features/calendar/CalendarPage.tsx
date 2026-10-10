import { CalendarDays, ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { WEEKDAY_RU, fmtDate } from "@/features/program/format"
import { activeProgram } from "@/features/program/programService"
import { parseISO, startOfWeek, toISODate, todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { cn } from "@/lib/utils"
import { dayStatus, monthGrid, weekProgress, weekStreak, type DayStatus } from "./calendar"
import { DaySheet } from "./DaySheet"

const STATUS_RU: Record<DayStatus, string> = { done: "сделано", planned: "запланировано", missed: "пропущено", rest: "отдых" }
const DOT: Record<DayStatus, string> = { done: "bg-primary", planned: "border border-primary", missed: "bg-destructive/50", rest: "invisible" }

const monthTitle = (month: string) => {
  const t = parseISO(month).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const shiftMonth = (month: string, n: number) => {
  const d = parseISO(month)
  d.setMonth(d.getMonth() + n)
  return toISODate(d)
}

export default function CalendarPage() {
  const rows = useDb((s) => s.rows)
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 8) + "01")
  const [day, setDay] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const empty = !activeProgram(rows) && Object.keys(rows.workouts).length === 0
  const week = weekProgress(rows, startOfWeek(today))
  const pick = (d: string) => {
    setDay(d)
    setOpen(true)
  }
  return (
    <section className="grid gap-4 px-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Календарь</h1>
          <p className="text-sm text-muted-foreground">{monthTitle(month)}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Следующий месяц" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </header>
      {empty ? (
        <EmptyState
          icon={CalendarDays}
          title="Пока пусто"
          text="Календарь заполнится после анкеты"
          action={
            <Button asChild>
              <Link to="/onboarding">Заполнить анкету</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Flame className="size-4 text-primary" /> Стрик: {weekStreak(rows, today)} нед.
              </span>
              <span className="text-muted-foreground tabular-nums">
                Эта неделя: {week.done}/{week.total}
              </span>
            </div>
            <Progress value={week.total ? (week.done / week.total) * 100 : 0} />
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAY_RU.map((d) => (
              <span key={d} className="text-xs text-muted-foreground">
                {d}
              </span>
            ))}
            {monthGrid(month)
              .flat()
              .map((d) => {
                const status = dayStatus(rows, d, today)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={`${fmtDate(d)}: ${STATUS_RU[status]}`}
                    onClick={() => pick(d)}
                    className={cn(
                      "mx-auto flex size-10 flex-col items-center justify-center rounded-md text-sm hover:bg-accent",
                      d.slice(0, 7) !== month.slice(0, 7) && "text-muted-foreground/50",
                      d === today && "ring-1 ring-primary",
                    )}
                  >
                    <span className="tabular-nums">{Number(d.slice(8))}</span>
                    <span className={cn("mt-0.5 size-1.5 rounded-full", DOT[status])} />
                  </button>
                )
              })}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(["done", "planned", "missed"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", DOT[s])} />
                {STATUS_RU[s]}
              </li>
            ))}
          </ul>
          <DaySheet date={day} open={open} onOpenChange={setOpen} />
        </>
      )}
    </section>
  )
}
