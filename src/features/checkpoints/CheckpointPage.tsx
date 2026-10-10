import { ClipboardList } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { all as exercises } from "@/features/exercises/useExercises"
import { fmtDate } from "@/features/program/format"
import { activeProgram, blockComplete } from "@/features/program/programService"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { AnkleCriteria } from "./AnkleCriteria"
import { checkpointRows, KIND_RU, latestTest, remainingSessions } from "./checkpoint"
import { completeTest, type TestDraft } from "./testDraft"
import { TestForm } from "./TestForm"

/** retest: shows the previous test, takes a new one and builds the next block (or block 0 without a program) */
export default function CheckpointPage() {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const upsert = useDb((s) => s.upsert)
  const navigate = useNavigate()
  const [draft, setDraft] = useState<TestDraft>({})
  const profile = rows.profiles[userId]
  if (!profile) {
    return <EmptyState icon={ClipboardList} title="Сначала анкета" action={<Button asChild><Link to="/onboarding">Заполнить</Link></Button>} />
  }
  const today = todayISO()
  const prev = latestTest(rows)
  const active = activeProgram(rows)
  const remaining = remainingSessions(rows)
  const warn = active !== undefined && remaining > 0 && !blockComplete(rows, today)
  const withAnkle = profile.injuries.includes("ankle")
  const results = completeTest(draft, withAnkle)
  const submit = () => {
    if (!results) return
    const out = checkpointRows(rows, results, userId, today, exercises)
    upsert("tests", out.test)
    upsert("programs", out.program.program)
    for (const s of out.program.sessions) upsert("planned_sessions", s)
    toast.success(`Блок готов: ${out.program.sessions.length} тренировок, первая ${fmtDate(out.program.sessions[0].date)}`)
    navigate("/", { replace: true })
  }
  return (
    <section className="grid gap-4 px-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Чекпоинт</h1>
        <p className="text-sm text-muted-foreground">Повтори тест — по результатам соберётся следующий 4-недельный блок</p>
      </header>
      {prev && (
        <Card>
          <CardHeader>
            <CardTitle>Прошлый тест · {KIND_RU[prev.kind]} · {fmtDate(prev.date)}</CardTitle>
            <CardDescription>
              Отжимания {prev.results.pushups} · Приседания {prev.results.squats} · Планка {prev.results.plank_s} с
              {prev.results.ankle && (
                <>
                  <br />
                  Knee-to-wall {prev.results.ankle.knee_to_wall_diff_cm} см · Подъёмы {prev.results.ankle.single_leg_calf_raises} · Баланс {prev.results.ankle.balance_eyes_closed_s} с
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {warn && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Текущий блок не закончен: осталось {remaining}</CardTitle>
            <CardDescription>Новый блок начнётся сегодня и заменит оставшиеся тренировки</CardDescription>
          </CardHeader>
        </Card>
      )}
      <TestForm value={draft} onChange={setDraft} withAnkle={withAnkle} />
      {withAnkle && <AnkleCriteria ankle={draft} />}
      <Button size="lg" className="w-full" disabled={!results} onClick={submit}>
        {active ? "Собрать следующий блок" : "Собрать программу"}
      </Button>
    </section>
  )
}
