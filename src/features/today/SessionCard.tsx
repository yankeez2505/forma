import type { ReactNode } from "react"
import { Link } from "react-router"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { bySlug } from "@/features/exercises/useExercises"
import type { PlannedExercise, SessionPlan } from "@/features/program/engine"
import { BLOCK_RU, DAY_RU, dose, fmtDate } from "@/features/program/format"

const name = (slug: string) => bySlug.get(slug)?.name ?? slug

function Row({ e }: { e: PlannedExercise }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <Link to={`/exercises/${e.slug}`} className="text-sm font-medium">
          {name(e.slug)}
        </Link>
        {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
      </div>
      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {dose(e)}
        {e.block === "main" ? ` · RIR ${e.targetRir}` : ""}
      </span>
    </li>
  )
}

/** a planned session: when, how long, and every exercise grouped by block */
export function SessionCard({ plan, title, action }: { plan: SessionPlan; title?: string; action?: ReactNode }) {
  const blocks = [...new Set(plan.exercises.map((e) => e.block))]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? DAY_RU[plan.dayType]}</CardTitle>
        <CardDescription>
          {fmtDate(plan.date)} · ≈{plan.estMin} мин · неделя {plan.week}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {blocks.map((block) => (
          <div key={block}>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{BLOCK_RU[block]}</h3>
            <ul className="divide-y">
              {plan.exercises
                .filter((e) => e.block === block)
                .map((e, i) => (
                  <Row key={`${e.slug}-${i}`} e={e} />
                ))}
            </ul>
          </div>
        ))}
      </CardContent>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  )
}
