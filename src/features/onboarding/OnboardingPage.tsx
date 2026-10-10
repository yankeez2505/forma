import { ClipboardCheck } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { all as exercises } from "@/features/exercises/useExercises"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { newId } from "@/lib/id"
import { STEPS, onboardingRows, stepValid, useOnboarding } from "./draft"
import { StepAbout } from "./steps/StepAbout"
import { StepEquipment } from "./steps/StepEquipment"
import { StepGoal } from "./steps/StepGoal"
import { StepInjuries } from "./steps/StepInjuries"
import { StepRegime } from "./steps/StepRegime"
import { StepSummary } from "./steps/StepSummary"
import { StepTest } from "./steps/StepTest"

const TITLE: Record<(typeof STEPS)[number], string> = {
  about: "О тебе",
  goal: "Цель",
  regime: "Режим",
  equipment: "Инвентарь",
  injuries: "Ограничения",
  test: "Физический тест",
  summary: "Готово",
}
const VIEW = { about: StepAbout, goal: StepGoal, regime: StepRegime, equipment: StepEquipment, injuries: StepInjuries, test: StepTest, summary: StepSummary }

export default function OnboardingPage() {
  const navigate = useNavigate()
  const hasProfile = useDb((s) => Boolean(s.rows.profiles[s.userId]))
  const upsert = useDb((s) => s.upsert)
  const { draft: d, patch, reset } = useOnboarding()
  if (hasProfile) {
    return <EmptyState icon={ClipboardCheck} title="Анкета уже заполнена" action={<Button asChild><Link to="/">На главную</Link></Button>} />
  }
  const key = STEPS[d.step] ?? "about"
  const Step = VIEW[key]
  const last = d.step === STEPS.length - 1
  const start = () => {
    const ctx = { userId: useDb.getState().userId, today: todayISO(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, seed: newId() }
    const rows = onboardingRows(d, ctx, exercises)
    upsert("profiles", rows.profile)
    upsert("body_metrics", rows.metric)
    upsert("tests", rows.test)
    upsert("programs", rows.program.program)
    for (const s of rows.program.sessions) upsert("planned_sessions", s)
    reset()
    navigate("/", { replace: true })
  }
  return (
    <main className="grid gap-5 px-4 pb-4">
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">Шаг {d.step + 1} из {STEPS.length}</p>
        <Progress value={((d.step + 1) / STEPS.length) * 100} />
        <h1 className="text-xl font-semibold">{TITLE[key]}</h1>
      </div>
      <Step d={d} patch={patch} />
      <div className="flex gap-2">
        {d.step > 0 && (
          <Button type="button" variant="ghost" onClick={() => patch({ step: d.step - 1 })}>
            Назад
          </Button>
        )}
        {last ? (
          <Button type="button" size="lg" className="flex-1" disabled={!stepValid(d, d.step)} onClick={start}>
            Начать программу
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={!stepValid(d, d.step)} onClick={() => patch({ step: d.step + 1 })}>
            Дальше
          </Button>
        )}
      </div>
    </main>
  )
}
