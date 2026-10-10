import { Dumbbell } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import type { SetLog } from "@/features/program/engine"
import { BLOCK_RU, DAY_RU, fmtDate } from "@/features/program/format"
import { isoDate } from "@/features/program/model"
import { useDb } from "@/lib/db"
import type { Workout } from "@/lib/schema"
import { cn } from "@/lib/utils"
import { abortWorkout, completeWorkout, LOGGED, logSet, progress, resumeDecision, setRow, toggleDone, useActiveWorkout, type ActiveWorkout } from "./activeWorkout"
import { ChecklistItem, ExerciseBlock } from "./ExerciseBlock"
import { FinishSheet } from "./FinishSheet"
import { RestTimer } from "./RestTimer"
import { mmss, useNow } from "./useCountdown"
import { useWakeLock } from "./useWakeLock"

const home = (
  <Button asChild>
    <Link to="/">На главную</Link>
  </Button>
)

export default function WorkoutPage() {
  const { id = "" } = useParams()
  const draft = useActiveWorkout((s) => s.draft)
  const decision = resumeDecision(draft, { workoutId: id })
  if (!draft || decision === "none") return <EmptyState icon={Dumbbell} title="Тренировка не найдена" action={home} />
  if (decision === "ask")
    return (
      <EmptyState
        icon={Dumbbell}
        title="Идёт другая тренировка"
        text={fmtDate(isoDate(draft.startedAt))}
        action={
          <Button asChild>
            <Link to={`/workout/${draft.workoutId}`}>Перейти к ней</Link>
          </Button>
        }
      />
    )
  return <Active draft={draft} />
}

/** the workouts row to finish or abort; rebuilt from the draft if the db lost it */
function workoutRow(draft: ActiveWorkout): Workout {
  const { rows, userId } = useDb.getState()
  const now = new Date().toISOString()
  return (
    rows.workouts[draft.workoutId] ?? {
      id: draft.workoutId,
      user_id: userId,
      created_at: now,
      updated_at: now,
      planned_session_id: draft.plannedSessionId,
      started_at: draft.startedAt,
      finished_at: null,
      pre_soreness: null,
      pre_sleep: null,
      pre_energy: null,
      rpe: null,
      notes: null,
    }
  )
}

function Active({ draft }: { draft: ActiveWorkout }) {
  useWakeLock()
  const now = useNow()
  const navigate = useNavigate()
  const set = useActiveWorkout((s) => s.set)
  const [finishOpen, setFinishOpen] = useState(false)
  const [abortOpen, setAbortOpen] = useState(false)
  const { plan } = draft
  const { done, total } = progress(draft)
  const elapsed = Math.max(0, Math.floor((now - Date.parse(draft.startedAt)) / 1000))
  const rest = draft.restUntil
  const resting = rest !== null && rest > now
  const blocks = [...new Set(plan.exercises.map((e) => e.block))]

  const onLog = (s: SetLog) => {
    useDb.getState().upsert("workout_sets", setRow(draft.workoutId, s))
    set(logSet(draft, s, Date.now()))
  }
  const finish = (rpe: number | null, notes: string) => {
    useDb.getState().upsert("workouts", completeWorkout(workoutRow(draft), rpe, notes, new Date()))
    set(null)
    toast.success("Тренировка сохранена")
    navigate("/", { replace: true })
  }
  const abort = () => {
    const aborted = abortWorkout(workoutRow(draft), done, new Date())
    if (aborted) useDb.getState().upsert("workouts", aborted)
    set(null)
    navigate("/", { replace: true })
  }

  return (
    <div className={cn("grid gap-5 px-4", resting && "pb-28")}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{DAY_RU[plan.dayType]}</h1>
          <p className="text-sm text-muted-foreground">
            {fmtDate(plan.date)} · <span className="tabular-nums">{mmss(elapsed)}</span>
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbortOpen(true)}>
          Прервать
        </Button>
      </header>
      <div className="grid gap-1">
        <Progress value={total ? (done / total) * 100 : 0} aria-label="Прогресс" />
        <p className="text-xs text-muted-foreground">
          {done}/{total} сетов
        </p>
      </div>
      {blocks.map((block) => (
        <section key={block} className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{BLOCK_RU[block]}</h2>
          {plan.exercises
            .filter((e) => e.block === block)
            .map((ex) =>
              LOGGED.includes(block) ? (
                <ExerciseBlock key={ex.slug} ex={ex} sets={draft.sets} onLog={onLog} />
              ) : (
                <ChecklistItem key={ex.slug} ex={ex} done={draft.done.includes(ex.slug)} onToggle={() => set(toggleDone(draft, ex.slug))} />
              ),
            )}
        </section>
      ))}
      <Button type="button" size="lg" className="w-full" onClick={() => setFinishOpen(true)}>
        Завершить
      </Button>
      <FinishSheet open={finishOpen} onOpenChange={setFinishOpen} onFinish={finish} />
      <Dialog open={abortOpen} onOpenChange={setAbortOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Прервать тренировку?</DialogTitle>
            <DialogDescription>{done > 0 ? "Залогированные сеты сохранятся" : "Ничего не сохранится"}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbortOpen(false)}>
              Отмена
            </Button>
            <Button type="button" variant="destructive" onClick={abort}>
              Прервать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {rest !== null && rest > now && (
        <RestTimer until={rest} onSkip={() => set({ ...draft, restUntil: null })} onExtend={(s) => set({ ...draft, restUntil: rest + s * 1000 })} />
      )}
    </div>
  )
}
