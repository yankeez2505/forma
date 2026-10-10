import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { ClipboardList, Download, Trash2 } from "lucide-react"
import { ChoiceGroup } from "@/components/ChoiceGroup"
import { Disclaimer } from "@/components/Disclaimer"
import { EmptyState } from "@/components/EmptyState"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ACTIVITY_RU, EQUIPMENT_RU, EXPERIENCE_RU, GOAL_RU, INJURY_RU } from "@/content/labels"
import { KIND_RU, latestTest } from "@/features/checkpoints/checkpoint"
import { all as exercises } from "@/features/exercises/useExercises"
import { fmtDate, trainingDays } from "@/features/program/format"
import { activeProgram, historyFor, storedConfig } from "@/features/program/programService"
import { todayISO } from "@/lib/dates"
import { useDb } from "@/lib/db"
import type { Profile, Sex } from "@/lib/schema"
import { ConfirmDialog } from "./ConfirmDialog"
import { ageText, exportJson, programAffected, restartProgram } from "./profile"
import { ProfileForm } from "./ProfileForm"
import { SyncStatus } from "./SyncStatus"

type Theme = "system" | "light" | "dark"
const THEMES: { value: Theme; label: string }[] = [{ value: "system", label: "Системная" }, { value: "light", label: "Светлая" }, { value: "dark", label: "Тёмная" }]
const FIGURES: { value: Sex; label: string }[] = [{ value: "male", label: "Мужская" }, { value: "female", label: "Женская" }]
const LOCAL_KEYS = ["forma-db", "forma-onboarding", "forma-active-workout"]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-sm uppercase text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function ProfileCard({ p, onEdit }: { p: Profile; onEdit: () => void }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="text-base">
          {p.sex === "male" ? "Мужчина" : "Женщина"}, {ageText(new Date().getFullYear() - p.birth_year)}, {p.height_cm} см
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>{GOAL_RU[p.goal]} · {EXPERIENCE_RU[p.experience]} · {ACTIVITY_RU[p.activity_level]}</p>
        <p>{p.days_per_week} дн/нед ({trainingDays(p.days_per_week)}) · {p.session_min} мин</p>
        <div className="flex flex-wrap gap-1">
          {p.equipment.map((e) => <Badge key={e} variant="secondary">{EQUIPMENT_RU[e]}</Badge>)}
          {p.injuries.map((i) => <Badge key={i} variant="outline">{INJURY_RU[i]}</Badge>)}
        </div>
        <Button variant="outline" size="sm" className="w-fit" onClick={onEdit}>Изменить</Button>
      </CardContent>
    </Card>
  )
}

function ProgramCard({ onRebuild }: { onRebuild: () => void }) {
  const rows = useDb((s) => s.rows)
  const active = activeProgram(rows)
  const latest = latestTest(rows)
  const cfg = active ? storedConfig(active) : undefined
  return (
    <Card className="gap-3 py-4">
      <CardContent className="grid gap-2 text-sm">
        {active && cfg ? (
          <p>Блок {cfg.blockIndex + 1} с {fmtDate(cfg.blockStart)} · старт программы {fmtDate(active.start_date)} · {active.template === "upperlower" ? "Верх / Низ" : "Full-body A/B"}</p>
        ) : (
          <p className="text-muted-foreground">Активной программы нет</p>
        )}
        {latest ? (
          <p className="text-muted-foreground">по тесту {KIND_RU[latest.kind]} от {fmtDate(latest.date)}</p>
        ) : (
          <p className="text-muted-foreground">Сначала пройди тест на <Link to="/checkpoint" className="underline">чекпоинте</Link></p>
        )}
        <Button variant="outline" size="sm" className="w-fit" disabled={!latest} onClick={onRebuild}>
          {active ? "Пересобрать программу" : "Собрать программу"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const upsert = useDb((s) => s.upsert)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [edit, setEdit] = useState(false)
  const [askRebuild, setAskRebuild] = useState(false)
  const [askClear, setAskClear] = useState(false)
  const profile = rows.profiles[userId]
  const active = activeProgram(rows)

  const rebuild = () => {
    const latest = latestTest(rows)
    if (!profile || !latest) return
    const out = restartProgram(active, profile, latest, todayISO(), exercises, historyFor(rows))
    if (out.deactivate) upsert("programs", out.deactivate)
    upsert("programs", out.program.program)
    out.program.sessions.forEach((s) => upsert("planned_sessions", s))
    setAskRebuild(false)
    toast.success("Новая программа готова")
    navigate("/")
  }
  const onSaved = (next: Profile) => {
    if (profile && active && programAffected(profile, next)) setAskRebuild(true)
  }
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportJson(rows, userId, new Date().toISOString())], { type: "application/json" }))
    const a = Object.assign(document.createElement("a"), { href: url, download: `forma-${todayISO()}.json` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const clearLocal = () => {
    LOCAL_KEYS.forEach((k) => localStorage.removeItem(k))
    location.reload()
  }

  return (
    <div className="grid gap-6 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
      {!profile && <EmptyState icon={ClipboardList} title="Анкеты пока нет" action={<Button asChild><Link to="/onboarding">Заполнить</Link></Button>} />}
      <Section title="Аккаунт">
        <SyncStatus />
      </Section>
      {profile && (
        <>
          <Section title="Анкета">
            <ProfileCard p={profile} onEdit={() => setEdit(true)} />
          </Section>
          <Section title="Программа">
            <ProgramCard onRebuild={() => (active ? setAskRebuild(true) : rebuild())} />
          </Section>
        </>
      )}
      <Section title="Внешний вид">
        <ChoiceGroup value={theme} onChange={setTheme} options={THEMES} columns={3} />
        {profile && (
          <>
            <p className="pt-2 text-sm text-muted-foreground">Фигура в демо упражнений</p>
            <ChoiceGroup value={profile.figure} onChange={(figure) => upsert("profiles", { ...profile, figure })} options={FIGURES} columns={2} />
          </>
        )}
      </Section>
      <Section title="Данные">
        <Button variant="outline" className="w-fit" onClick={exportData}>
          <Download /> Экспорт JSON
        </Button>
        <Button variant="ghost" className="w-fit text-destructive" onClick={() => setAskClear(true)}>
          <Trash2 /> Очистить данные на устройстве
        </Button>
      </Section>
      {profile && <ProfileForm profile={profile} open={edit} onOpenChange={setEdit} onSaved={onSaved} />}
      <ConfirmDialog
        open={askRebuild}
        onOpenChange={setAskRebuild}
        title="Пересобрать программу?"
        text="Цель, режим, инвентарь или травмы изменились. Новая программа начнётся сегодня, текущий блок закроется. Прогресс и история останутся."
        confirmLabel="Пересобрать"
        cancelLabel="Оставить как есть"
        onConfirm={rebuild}
      />
      <ConfirmDialog
        open={askClear}
        onOpenChange={setAskClear}
        title="Очистить данные на устройстве?"
        text="Удалит анкету, программу и тренировки с этого устройства. Данные в облаке (если вход выполнен) останутся и подтянутся при следующем входе."
        confirmLabel="Очистить"
        destructive
        onConfirm={clearLocal}
      />
      <Disclaimer className="pt-4" />
      <p className="text-xs text-muted-foreground">Forma · данные только твои</p>
    </div>
  )
}
