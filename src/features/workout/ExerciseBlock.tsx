import { ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bySlug } from "@/features/exercises/useExercises"
import type { PlannedExercise, SetLog } from "@/features/program/engine"
import { dose } from "@/features/program/format"
import { setKey } from "./activeWorkout"
import { SetRow } from "./SetRow"

const name = (slug: string) => bySlug.get(slug)?.name ?? slug

/** a logged exercise: header with the dose, one SetRow per set */
export function ExerciseBlock({ ex, sets, onLog }: { ex: PlannedExercise; sets: Record<string, SetLog>; onLog: (s: SetLog) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link to={`/exercises/${ex.slug}`} className="flex items-center gap-1">
            {name(ex.slug)}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {dose(ex)} · RIR {ex.targetRir}
          {ex.loadKg !== undefined ? ` · ${ex.loadKg} кг` : ""}
        </p>
        {ex.note && <p className="text-sm text-muted-foreground">{ex.note}</p>}
      </CardHeader>
      <CardContent className="grid gap-1">
        {Array.from({ length: ex.sets }, (_, i) => i + 1).map((n) => (
          <SetRow key={n} ex={ex} setNo={n} logged={sets[setKey(ex.slug, n)]} onLog={onLog} />
        ))}
      </CardContent>
    </Card>
  )
}

/** warm-up / cool-down item: name, dose and a tick */
export function ChecklistItem({ ex, done, onToggle }: { ex: PlannedExercise; done: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <Link to={`/exercises/${ex.slug}`} className="font-medium">
          {name(ex.slug)}
        </Link>
        <p className="text-sm text-muted-foreground">{dose(ex)}</p>
      </div>
      <Button type="button" variant={done ? "secondary" : "outline"} size="sm" aria-pressed={done} onClick={onToggle}>
        {done ? "✓" : "Готово"}
      </Button>
    </div>
  )
}
