# Forma v1 — план реализации, часть 2: экраны

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочее приложение v1 поверх фундамента части 1: онбординг с тестом создаёт программу, экран «Сегодня» ведёт к тренировке с таймером и логом подходов (офлайн, синхронизация через `db`), календарь показывает план/факт и стрики, «Прогресс» — замеры и графики, чекпоинт перезапускает блок, «Питание» — КБЖУ, недельное меню из белорусских продуктов и список покупок.

**Architecture:** Вся логика — чистые функции над строками `db` (`Rows`) и типами движка, покрытые Vitest (окружение `node`, без jsdom). Компоненты тонкие: читают `useDb`, вызывают чистые функции, пишут через `db.upsert`. Два persist-стора черновиков (`onboarding`, `activeWorkout`) переживают закрытие PWA. Никаких удалений строк: прерванная тренировка с ≥1 подходом получает `finished_at` и заметку «Прервано» (идёт в историю), с 0 подходов — остаётся незавершённой строкой, которую `historyFor` игнорирует; старые блоки остаются историей. Перед стартом сессии `prepareSession` применяет внутриблочную прогрессию и этот (прогрессированный, но не авторегулированный) план записывается обратно в `planned_sessions`.

**Tech Stack:** то же, что в части 1 (Vite 8, React 19.3, TS 6, Tailwind 4 + shadcn + lucide-react, react-router 7, zustand 5, supabase-js 2, vitest 5) + `recharts` через `npx shadcn@latest add chart`.

**Spec:** `docs/superpowers/specs/2026-10-10-forma-design.md` (разделы 5, 7, 9, 10, 11). Часть 1: `docs/superpowers/plans/2026-10-10-forma-foundation.md`, её леджер решений — `.superpowers/sdd/2026-10-10-forma-foundation/progress.md` (строки `Ruling:`).

## Global Constraints

- Папка `D:\Vibe Design\traning`, пакет и репо `forma`, `base: '/forma/'`, URL `https://yankeez2505.github.io/forma/`. Пуш в `main` = деплой (Actions: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`).
- Любой файл кода ≤200 строк; чистые модули ≤150. Новый файл: скелет → commit → по одной функции → commit. Существующий файл — точечные правки.
- Коммиты `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`; каждый коммит — рабочее состояние (`npm test`, `npm run typecheck`, `npm run build` зелёные).
- TDD для каждой чистой функции: тест → RED → код → GREEN. Компоненты без unit-тестов (нет jsdom); каждый экран проверяется Playwright-скриншотом: телефон 390×844 DPR 3 через CDP `Emulation.setDeviceMetricsOverride` (после — `Emulation.clearDeviceMetricsOverride`), десктоп — развёрнутое окно 1707 CSS / DPR 1.5 (`Browser.setWindowBounds {windowState:'maximized'}`, никогда `browser_resize`). Скриншоты только в `_screens/`, удалять в конце задачи.
- Тексты UI — русский, без «вы»-канцелярита (обращение на «ты», как в части 1: «Войди, чтобы…»). Код, идентификаторы, slug, коммиты — английский.
- Даты — `YYYY-MM-DD` в локальной зоне через `@/lib/dates` (`todayISO`, `addDays`, `diffDays`, `startOfWeek`, `weekday`); `new Date(iso)` запрещён. Timestamps (`started_at`, `finished_at`) — ISO-строки `new Date().toISOString()`.
- Все строки данных только через `useDb.getState().upsert(table, row)`; `id` — `newId()` или детерминированный `hashToUuid(...)` там, где строка уникальна по смыслу (замер за дату, подход тренировки, плановая сессия). `db.remove` в части 2 не используется (удаления не доезжают до сервера).
- `.env` не коммитить; секреты только в GitHub Secrets. Без Supabase приложение полностью работает локально.
- Mobile-first: основной вьюпорт 390×844; десктоп — контент в `AppLayout` (`max-w-3xl`). Нижняя навигация остаётся: Сегодня / Календарь / Упражнения / Прогресс / Питание; профиль — иконка в шапке.
- Медицинский дисклеймер (одна фраза, компонент `Disclaimer`) — на шаге теста онбординга, на экране чекпоинта у критериев разблокировки и под карточкой программы на «Сегодня».

## Review Focus

1. Черновик тренировки переживает перезагрузку и смену маршрута: открытие `/workout/<другой id>` при активном черновике предлагает продолжить/прервать текущий, «Сегодня» показывает «Продолжить тренировку». Тест — Task 3 (`resumeDecision`).
2. Границы дат: тренировка, начатая до полуночи и закрытая после, относится к дню `started_at` (локальная дата); «пропущено» — только даты < сегодня, сегодняшняя сессия до конца дня — «запланировано». Тест — Task 5 (`dayStatus`).
3. Чекпоинт без травмы голеностопа: нет полей теста голеностопа, блок пересобирается; при частично выполненных критериях показано, какой именно не пройден. Тест — Task 7 (`ankleStatus`).
4. Нет ни одного замера веса: «Питание» и «Прогресс» не показывают NaN — просят ввести вес; цели считаются только при наличии веса. Тест — Task 9 (`nutritionFor` → `null`).
5. Вход в аккаунт после локального онбординга: строка профиля с `id: "local"` перекладывается на `id = uid` (иначе сервер отвергнет не-uuid), остальные строки сохраняют id. Тест — Task 1 (`adoptUser re-keys profile`).

---

## File Structure

```
src/features/program/
  model.ts            StoredConfig, детерминированные id, преобразования строка ↔ SessionPlan
  programService.ts   activeProgram, plannedSessions, historyFor, nextSession, blockComplete, buildProgram, nextBlock
  prepare.ts          prepareSession — внутриблочная двойная прогрессия перед стартом сессии
  engine/generateBlock.ts   + export lastTwo, lastPlanned, DAYS_PER_BLOCK; дата-ориджин блока из cfg.blockStart
  engine/fixtures/rows.ts   тестовые строки db (META, ownerStored, ownerProfileRow, programRows, finishSession) — только для тестов
  format.ts           WEEKDAY_RU, DAY_RU, BLOCK_RU, fmtDate, dose, trainingDays — подписи плана для UI
  engine/types.ts           + blockStart?: string
src/features/onboarding/
  draft.ts            OnboardingDraft, store (persist "forma-onboarding"), draftComplete, onboardingRows
  OnboardingPage.tsx  шаги (StepAbout, StepGoal, StepRegime, StepEquipment, StepInjuries, StepTest, StepSummary) — по файлу на шаг в steps/
src/features/today/
  todayState.ts       todayState(rows, draft, today) → union состояний экрана
  TodayPage.tsx       (заменяет src/app/pages/TodayPage.tsx)
  SessionCard.tsx     карточка сессии (список упражнений, доза, ссылка на упражнение)
  CheckInSheet.tsx    чек-ин боль/сон/энергия → старт
src/features/workout/
  activeWorkout.ts    persist-стор "forma-active-workout" + чистые reducers/builders (setKey, setRow, resumeDecision)
  useStartWorkout.ts  startWorkout(plan, checkIn): prepareSession → запись плана → черновик; ResumeDialog.tsx — продолжить/прервать активный черновик
  WorkoutPage.tsx     маршрут /workout/:id
  ExerciseBlock.tsx   упражнение + строки подходов
  SetRow.tsx          ввод повторов/секунд/кг, кнопка «Готово»
  RestTimer.tsx       отдых после подхода; useCountdown.ts; useWakeLock.ts
  FinishSheet.tsx     RPE + заметка → завершение
src/features/calendar/
  calendar.ts         monthGrid, dayStatus, weekStreak, weekProgress
  CalendarPage.tsx    (заменяет src/app/pages/CalendarPage.tsx), DaySheet.tsx
src/features/analytics/
  stats.ts            metricSeries, weeklySetsByGroup, planVsFact, testSeries, bodyFatNow, MUSCLE_GROUP
  ProgressPage.tsx    (заменяет src/app/pages/ProgressPage.tsx), MetricsForm.tsx, charts/*.tsx (lazy)
src/features/checkpoints/
  checkpoint.ts       ankleStatus, latestTest, remainingSessions, checkpointRows; AnkleCriteria.tsx
  testDraft.ts        TestDraft, completeTest — общий черновик теста онбординга и чекпоинта
  CheckpointPage.tsx  маршрут /checkpoint, TestForm.tsx (общий с онбордингом — живёт здесь, онбординг импортирует)
src/features/nutrition/
  foods.ts            типы Food/Menu, загрузка src/content/foods.json и menus.json
  nutrition.ts        nutritionFor, menuFor, scaleMenu, totals, dayTotals, shoppingList
  NutritionPage.tsx   (заменяет src/app/pages/NutritionPage.tsx), MenuDay.tsx, ShoppingSheet.tsx
src/content/foods.json, src/content/menus.json, src/content/foods.test.ts (валидация zod)
src/features/profile/
  profile.ts          programAffected, restartProgram, exportJson
  ProfilePage.tsx     (заменяет src/app/pages/ProfilePage.tsx; SyncStatus переезжает в SyncStatus.tsx), ProfileForm.tsx
src/content/labels.ts  + GOAL_RU, EXPERIENCE_RU, ACTIVITY_RU, INJURY_RU
src/components/Disclaimer.tsx, src/components/EmptyState.tsx, src/components/Rating.tsx (1–5 кнопок), src/components/ChoiceGroup.tsx (ChoiceGroup + MultiChoice)
src/app/router.tsx  + onboarding, workout/:id, checkpoint
```

---

### Task 1: Модель программы и сервис над `db` (TDD)

**Files:**
- Modify: `src/features/program/engine/types.ts` (поле `blockStart?: string` в `ProgramConfig`), `src/features/program/engine/generateBlock.ts` (экспорт `lastTwo`, `lastPlanned`, `DAYS_PER_BLOCK`; ориджин дат), `src/lib/db.ts` (`adoptUser` перекладывает профиль), `src/lib/db.test.ts`, `src/features/program/engine/generateBlock.test.ts`
- Create: `src/features/program/model.ts`, `src/features/program/programService.ts`, `src/features/program/prepare.ts`, `src/features/program/engine/fixtures/rows.ts` (тестовые строки, используются задачами 3–9), `src/features/program/model.test.ts`, `src/features/program/programService.test.ts`, `src/features/program/prepare.test.ts`

**Interfaces:**
- Consumes: `generateBlock(cfg, exercises, history, blockIndex, programId)`, `progressExercise`, `buildPool`, `deriveRestrictions`, `hashToUuid`, типы `ProgramConfig`, `SessionPlan`, `PlannedExercise`, `SessionLog`, `SetLog`, `Pool` из `@/features/program/engine`; `Rows`, `Upsertable`, `useDb` из `@/lib/db`; `Program`, `PlannedSession`, `Workout`, `WorkoutSet`, `TestRow` из `@/lib/schema`; `all`, `bySlug` из `@/features/exercises/useExercises`; `newId` из `@/lib/id`.
- Produces:
```ts
// engine/types.ts — добавить в ProgramConfig:
  /** first day of the current block; defaults to startDate + 28 × blockIndex */
  blockStart?: string
// engine/generateBlock.ts
export const DAYS_PER_BLOCK = 28
export function lastTwo(recent: SessionLog[], slug: string): SetLog[][]      // recent — newest first
export function lastPlanned(recent: SessionLog[], slug: string): PlannedExercise | undefined   // доза (block main), с которой slug планировался последний раз; recent — newest first
// внутри generateBlock: const origin = cfg.blockStart ?? addDays(cfg.startDate, DAYS_PER_BLOCK * blockIndex)

// model.ts
export interface StoredConfig extends ProgramConfig { blockIndex: number; blockStart: string }
export const metricId = (userId: string, date: string) => hashToUuid(`bm:${userId}:${date}`)
export const targetId = (userId: string, date: string) => hashToUuid(`nt:${userId}:${date}`)
export const setId = (workoutId: string, slug: string, setNo: number) => hashToUuid(`set:${workoutId}:${slug}:${setNo}`)
export const testId = (userId: string, date: string, kind: TestRow["kind"]) => hashToUuid(`test:${userId}:${date}:${kind}`)
export function toPlannedRow(s: SessionPlan, programId: string): Upsertable<"planned_sessions">   // { id: s.id, program_id, date, week, day_type: s.dayType, exercises: s.exercises, est_min: s.estMin }
export function toSessionPlan(row: PlannedSession): SessionPlan   // обратное; exercises as PlannedExercise[]
export const isoDate = (timestamp: string) => toISODate(new Date(timestamp))   // локальная дата ISO-времени

// programService.ts
export function activeProgram(rows: Rows): Program | undefined
export const storedConfig = (p: Program) => p.config as StoredConfig
export function plannedSessions(rows: Rows, programId: string): SessionPlan[]              // только текущий блок: date ≥ storedConfig(program).blockStart, по дате ↑; нет программы → []
export function finishedByPlanned(rows: Rows): Map<string, Workout>                       // finished_at !== null, по planned_session_id
export function historyFor(rows: Rows): SessionLog[]                                      // завершённые тренировки, дата = isoDate(started_at), по дате ↑; planned — exercises плановой сессии (если есть)
export function nextSession(rows: Rows, today: string): SessionPlan | undefined           // первая незавершённая сессия активной программы с date ≥ today
export function blockComplete(rows: Rows, today: string): boolean                         // активная программа есть и (все сессии завершены или последняя дата < today)
export interface ProgramRows { program: Upsertable<"programs">; sessions: Upsertable<"planned_sessions">[] }
export function buildProgram(cfg: StoredConfig, exercises: Exercise[], history: SessionLog[], id = newId()): ProgramRows
export function nextBlock(program: Program, latestTest: TestInput, blockStart: string, exercises: Exercise[], history: SessionLog[]): ProgramRows

// prepare.ts
export function prepareSession(plan: SessionPlan, history: SessionLog[], cfg: StoredConfig, exercises: Exercise[]): SessionPlan
```
`buildProgram`: `generateBlock(cfg, exercises, history, cfg.blockIndex, id)`; строка программы `{ id, start_date: cfg.startDate, goal: cfg.profile.goal, template: cfg.profile.days_per_week === 4 ? "upperlower" : "fullbody", config: cfg, active: true }`. `nextBlock`: `cfg' = { ...storedConfig(program), latestTest, blockIndex: +1, blockStart }` → `buildProgram(cfg', …, program.id)` с `start_date` прежним. `prepareSession`: `recentDesc` — история по дате ↓, `pool = buildPool(exercises, cfg.profile, deriveRestrictions(cfg.profile, cfg.latestTest))`; для каждого `e` с `block === "main"`: `ex = bySlug.get(e.slug)`; нет `ex` или `e.slug` нет в `pool[ex.pattern]` — оставить как есть; иначе `prev = lastPlanned(recentDesc, e.slug) ?? e`, `next = progressExercise(prev, lastTwo(recentDesc, e.slug), pool[ex.pattern], ex)`, результат `{ ...next, sets: e.sets, targetRir: e.targetRir }` — объём и RIR недели берутся из плана блока (деолад и RIR 4–5 первых недель не теряются), прогрессия меняет только вариант / повторы / вес / удержание; `estMin: estimateMinutes(exercises')`.

- [ ] **Step 1: Engine — тесты на `blockStart` и экспорт `lastTwo`** (в `generateBlock.test.ts`):

```ts
import { DAYS_PER_BLOCK, lastPlanned, lastTwo } from "./generateBlock"
it("blockStart moves the dates, not the picks; DAYS_PER_BLOCK is 28", () => {
  const late = generateBlock({ ...ownerConfig, blockStart: "2026-12-01" }, exercises, [], 1, "prog-1")
  expect(late[0].date >= "2026-12-01").toBe(true)
  expect(late.map((s) => s.exercises.map((e) => e.slug))).toEqual(generateBlock(ownerConfig, exercises, [], 1, "prog-1").map((s) => s.exercises.map((e) => e.slug)))
  expect(DAYS_PER_BLOCK).toBe(28)
})
it("lastTwo returns the two most recent logged set-lists of a slug", () => {
  const log = (date: string, reps: number) => ({ date, sets: [{ slug: "push-up", setNo: 1, reps }] })
  expect(lastTwo([log("2026-11-05", 12), log("2026-11-03", 10), log("2026-11-01", 8)], "push-up").map((s) => s[0].reps)).toEqual([12, 10])
})
it("lastPlanned returns the dose a slug was last planned with", () => {
  const planned = (date: string, sets: number) => ({ date, sets: [], planned: [{ slug: "push-up", block: "main" as const, sets, reps: [8, 12] as [number, number], targetRir: 4, restS: 60 }] })
  expect(lastPlanned([planned("2026-11-05", 3), planned("2026-11-03", 2)], "push-up")?.sets).toBe(3)
  expect(lastPlanned([planned("2026-11-05", 3)], "squat")).toBeUndefined()
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/program/engine/generateBlock.test.ts` → Expected: FAIL (`DAYS_PER_BLOCK`/`lastTwo`/`lastPlanned` not exported; dates still from startDate). **Step 3:** добавить `blockStart?` в `ProgramConfig`, `export` у `lastTwo`, `lastPlanned` и `DAYS_PER_BLOCK`, `const origin = cfg.blockStart ?? addDays(cfg.startDate, DAYS_PER_BLOCK * blockIndex)` → `sessionDates(origin, …)`. **Step 4: Run** → PASS. Commit `feat(engine): block start override, export lastTwo and lastPlanned`.

- [ ] **Step 5: `db.adoptUser` перекладывает профиль** — тест в `src/lib/db.test.ts`:

```ts
it("adoptUser re-keys the profile row to the new user id and keeps other ids", () => {
  const db = useDb.getState()
  db.replaceAll(emptyRows())
  db.upsert("profiles", { id: "local", sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk", goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light", injuries: [], equipment: ["mat"], figure: "male" })
  db.upsert("body_metrics", { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
  useDb.getState().adoptUser("11111111-2222-4333-8444-555555555555")
  const s = useDb.getState()
  expect(Object.keys(s.rows.profiles)).toEqual(["11111111-2222-4333-8444-555555555555"])
  expect(s.rows.profiles["11111111-2222-4333-8444-555555555555"].user_id).toBe("11111111-2222-4333-8444-555555555555")
  expect(s.rows.body_metrics.m1.user_id).toBe("11111111-2222-4333-8444-555555555555")
  expect(s.pending).toContain("profiles:11111111-2222-4333-8444-555555555555")
  expect(s.pending).not.toContain("profiles:local")
})
```
(Если после финального ревью части 1 такой тест уже есть — шаг пропустить, записать в леджер.)

- [ ] **Step 6: Run** `npx vitest run src/lib/db.test.ts` → FAIL (`profiles` keyed by `"local"`). **Step 7:** в `adoptUser` для таблицы `profiles` ключ и `id` строки = `userId`: `const id = t === "profiles" ? userId : r.id; rows[t][id] = { ...r, id, user_id: userId }; pending.push(`${t}:${id}`)`. **Step 8: Run** → PASS; `npx vitest run src/lib` все зелёные. Commit `fix(db): adoptUser re-keys the profile row`.

- [ ] **Step 9: `model.ts` — тесты** (`model.test.ts`):

```ts
import { ownerConfig } from "./engine/fixtures/owner"
import { generateBlock } from "./engine"
import { all as exercises } from "@/features/exercises/useExercises"
import { isoDate, metricId, setId, targetId, testId, toPlannedRow, toSessionPlan } from "./model"
it("ids are deterministic uuids", () => {
  expect(metricId("u", "2026-10-10")).toBe(metricId("u", "2026-10-10"))
  expect(metricId("u", "2026-10-10")).not.toBe(targetId("u", "2026-10-10"))
  expect(setId("w", "push-up", 1)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(testId("u", "2026-10-10", "baseline")).not.toBe(testId("u", "2026-10-10", "checkpoint"))
})
it("planned row round-trips to a session plan", () => {
  const s = generateBlock(ownerConfig, exercises, [], 0, "p")[0]
  const row = toPlannedRow(s, "p")
  expect(row).toMatchObject({ id: s.id, program_id: "p", date: s.date, week: 1, day_type: "A", est_min: s.estMin })
  expect(toSessionPlan({ ...row, user_id: "u", created_at: "", updated_at: "" })).toEqual(s)
})
it("isoDate takes the local calendar day of a timestamp", () => {
  const d = new Date(2026, 10, 2, 23, 30)
  expect(isoDate(d.toISOString())).toBe("2026-11-02")
})
```

- [ ] **Step 10: Run** → FAIL (module missing). **Step 11:** реализовать `model.ts` (см. Produces; `toSessionPlan`: `{ id: row.id, date: row.date, week: row.week, dayType: row.day_type, exercises: row.exercises as PlannedExercise[], estMin: row.est_min }`). **Step 12: Run** → PASS. Commit `feat(program): model — ids and planned-session mapping`.

- [ ] **Step 13: тестовые строки + `programService.ts` — тесты.** Сначала файл фикстур `src/features/program/engine/fixtures/rows.ts` (не тест, но используется только тестами; задачи 3–9 импортируют его):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { emptyRows, type Rows } from "@/lib/db"
import type { Profile } from "@/lib/schema"
import type { StoredConfig } from "../../model"
import { buildProgram, type ProgramRows } from "../../programService"
import { ownerConfig } from "./owner"

export const META = { user_id: "local", created_at: "2026-10-10T00:00:00.000Z", updated_at: "2026-10-10T00:00:00.000Z" }
export const ownerStored: StoredConfig = { ...ownerConfig, blockIndex: 0, blockStart: "2026-10-12" }
export const ownerProfileRow: Profile = {
  id: "local", ...META, sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk",
  goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light",
  injuries: ["ankle"], equipment: [...ownerConfig.profile.equipment], figure: "male",
}

/** the owner's profile plus an active block-0 program: 12 sessions Mon/Wed/Fri from 2026-10-12 */
export function programRows(p: ProgramRows = buildProgram(ownerStored, exercises, [], "p1")): Rows {
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  rows.programs.p1 = { ...p.program, ...META } as Rows["programs"][string]
  for (const s of p.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  return rows
}

type LoggedSet = { slug: string; reps?: number; durationS?: number; weightKg?: number }
/** a finished workout for a planned session; set numbers count per slug */
export function finishSession(rows: Rows, plannedId: string, startedAt: string, sets: LoggedSet[], rpe = 6): void {
  const id = `w-${plannedId}`
  rows.workouts[id] = { id, planned_session_id: plannedId, started_at: startedAt, finished_at: startedAt, pre_soreness: 2, pre_sleep: 4, pre_energy: 4, rpe, notes: null, ...META }
  sets.forEach((s, i) => {
    const set_no = sets.slice(0, i).filter((x) => x.slug === s.slug).length + 1
    rows.workout_sets[`${id}-${i}`] = { id: `${id}-${i}`, workout_id: id, exercise_id: s.slug, set_no, reps: s.reps ?? null, duration_s: s.durationS ?? null, weight_kg: s.weightKg ?? null, band_kg: null, rir: 4, ...META }
  })
}
```

Затем `programService.test.ts`:

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { clearedAnkle, ownerBaseline } from "./engine/fixtures/owner"
import { META, finishSession, ownerStored, programRows } from "./engine/fixtures/rows"
import type { Rows } from "@/lib/db"
import type { StoredConfig } from "./model"
import { activeProgram, blockComplete, buildProgram, finishedByPlanned, historyFor, nextBlock, nextSession, plannedSessions } from "./programService"

it("buildProgram: active fullbody program with 12 sessions from blockStart", () => {
  const p = buildProgram(ownerStored, exercises, [], "p1")
  expect(p.program).toMatchObject({ id: "p1", start_date: "2026-10-10", goal: "fat", template: "fullbody", active: true, config: ownerStored })
  expect(p.sessions).toHaveLength(12)
  expect(p.sessions[0]).toMatchObject({ program_id: "p1", date: "2026-10-12", week: 1, day_type: "A" })
})
it("activeProgram / plannedSessions / nextSession / blockComplete", () => {
  const rows = programRows()
  expect(activeProgram(rows)?.id).toBe("p1")
  const sessions = plannedSessions(rows, "p1")
  expect(sessions.map((s) => s.date).slice(0, 3)).toEqual(["2026-10-12", "2026-10-14", "2026-10-16"])
  expect(nextSession(rows, "2026-10-13")?.date).toBe("2026-10-14")
  finishSession(rows, sessions[1].id, "2026-10-14T18:00:00.000Z", [])
  expect(nextSession(rows, "2026-10-14")?.date).toBe("2026-10-16")
  expect(blockComplete(rows, "2026-11-06")).toBe(false)
  expect(blockComplete(rows, "2026-11-07")).toBe(true)
  expect(finishedByPlanned(rows).has(sessions[1].id)).toBe(true)
})
it("historyFor maps finished workouts to SessionLog, oldest first; unfinished workouts are ignored", () => {
  const rows = programRows()
  const [a, b, c] = plannedSessions(rows, "p1")
  finishSession(rows, b.id, "2026-10-14T18:00:00.000Z", [{ slug: "push-up", reps: 10 }])
  finishSession(rows, a.id, "2026-10-12T18:00:00.000Z", [{ slug: "push-up", reps: 9 }, { slug: "push-up", reps: 8 }])
  finishSession(rows, c.id, "2026-10-16T18:00:00.000Z", [])
  rows.workouts[`w-${c.id}`].finished_at = null
  const h = historyFor(rows)
  expect(h.map((s) => s.date)).toEqual(["2026-10-12", "2026-10-14"])
  expect(h[0]).toMatchObject({ dayType: "A", preSoreness: 2, rpe: 6, sets: [{ slug: "push-up", setNo: 1, reps: 9, rir: 4 }, { slug: "push-up", setNo: 2, reps: 8, rir: 4 }] })
  expect(h[0].planned).toEqual(a.exercises)
})
it("nextBlock bumps blockIndex, keeps program id and start_date, uses the new test", () => {
  const rows = programRows()
  const next = nextBlock(rows.programs.p1, { ...ownerBaseline, date: "2026-11-09", ankle: clearedAnkle }, "2026-11-09", exercises, historyFor(rows))
  expect(next.program).toMatchObject({ id: "p1", start_date: "2026-10-10", active: true })
  expect((next.program.config as StoredConfig)).toMatchObject({ blockIndex: 1, blockStart: "2026-11-09" })
  expect(next.sessions[0].date).toBe("2026-11-09")
  expect(next.sessions.some((s) => (s.exercises as { block: string }[]).some((e) => e.block === "finisher"))).toBe(true)
  rows.programs.p1 = { ...next.program, ...META } as Rows["programs"][string]
  for (const s of next.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  const current = plannedSessions(rows, "p1")
  expect(current).toHaveLength(12)
  expect(current.every((s) => s.date >= "2026-11-09")).toBe(true)
})
```

- [ ] **Step 14: Run** → FAIL. **Step 15:** реализовать по одной функции с коммитом после зелёного прогона: `activeProgram`+`storedConfig`+`plannedSessions`, `finishedByPlanned`+`historyFor`, `nextSession`+`blockComplete`, `buildProgram`+`nextBlock` (коммиты `feat(program): program selectors`, `feat(program): workout history`, `feat(program): next session and block completion`, `feat(program): build program and next block`). `plannedSessions`: `p = rows.programs[programId]`; нет → `[]`; иначе строки с `program_id === programId && date >= storedConfig(p).blockStart`, через `toSessionPlan`, по дате ↑ (строки прошлых блоков остаются в `rows` как история и видны календарю через `finishedByPlanned`). `historyFor`: группировать `workout_sets` по `workout_id`, `dayType` и `planned` (= `toSessionPlan(ps).exercises`) — из плановой сессии по `planned_session_id` (если есть), `sets` отсортировать по `set_no`. **Step 16: Run** → PASS.

- [ ] **Step 17: `prepare.ts` — тест** (`prepare.test.ts`):

```ts
it("prepareSession applies double progression from history before the session starts", () => {
  const plan = generateBlock(ownerConfig, exercises, [], 0, "p")[0]
  const squat = plan.exercises.find((e) => e.block === "main" && bySlug.get(e.slug)!.pattern === "squat")!
  const top = (date: string) => ({ date, sets: [1, 2, 3].map((n) => ({ slug: squat.slug, setNo: n, reps: 12, weightKg: 10 })) })
  const ready = prepareSession(plan, [top("2026-10-12"), top("2026-10-14")], { ...ownerConfig, blockIndex: 0, blockStart: "2026-10-12" }, exercises)
  const next = ready.exercises.find((e) => e.block === "main" && bySlug.get(e.slug)!.pattern === "squat")!
  expect(next.slug).not.toBe(squat.slug)
  expect(ready.estMin).toBeGreaterThan(0)
  expect(prepareSession(plan, [], { ...ownerConfig, blockIndex: 0, blockStart: "2026-10-12" }, exercises)).toEqual(plan)
})
```

- [ ] **Step 18: Run** → FAIL. **Step 19:** реализовать. **Step 20: Run** `npm test` → PASS (все). Commit `feat(program): in-block progression before a session`.

---
### Task 2: Онбординг — опрос, тест, создание программы

**Files:**
- Modify: `src/content/labels.ts` (+ `GOAL_RU`, `EXPERIENCE_RU`, `ACTIVITY_RU`, `INJURY_RU`), `src/features/program/model.ts` (+ `newConfig`, `profileInput`), `src/features/program/model.test.ts`, `src/app/pages/DevPreviewPage.tsx` (локальные `BLOCK_RU`, `DAY_RU`, `fmtDate`, `dose`, → импорт из `format.ts`), `src/app/router.tsx` (+ `onboarding`), `src/app/AppLayout.tsx` (без `BottomNav` на `/onboarding` и `/workout/*`)
- Create: `src/features/program/format.ts`, `src/features/program/format.test.ts`, `src/features/onboarding/draft.ts`, `src/features/onboarding/draft.test.ts`, `src/features/onboarding/OnboardingPage.tsx`, `src/features/onboarding/steps/StepAbout.tsx`, `StepGoal.tsx`, `StepRegime.tsx`, `StepEquipment.tsx`, `StepInjuries.tsx`, `StepTest.tsx`, `StepSummary.tsx`, `src/features/checkpoints/testDraft.ts`, `src/features/checkpoints/testDraft.test.ts`, `src/features/checkpoints/TestForm.tsx`, `src/components/Disclaimer.tsx`, `src/components/Rating.tsx`, `src/components/EmptyState.tsx`, `src/components/ChoiceGroup.tsx`

**Interfaces:**
- Consumes: `buildProgram`, `ProgramRows` (`programService.ts`), `metricId`, `testId`, `StoredConfig` (`model.ts`), `ProfileInput`, `TestInput`, `PlannedExercise`, `DayType`, `Block`, `WEEKDAYS` (`engine`), `Upsertable`, `useDb` (`@/lib/db`), `Profile`, `TestRow`, `Sex`, `Goal`, `Experience`, `ActivityLevel`, `EquipmentTag`, `InjuryTag` (`@/lib/schema`), `EQUIPMENT_RU` (`labels.ts`), `todayISO`, `parseISO` (`@/lib/dates`), `all as exercises` (`useExercises.ts`), `useSession` (`features/auth/useSession.ts`).
- Produces:
```ts
// src/content/labels.ts
export const GOAL_RU: Record<Goal, string> = { fat: "Сжечь жир", muscle: "Набрать массу", tone: "Тонус" }
export const EXPERIENCE_RU: Record<Experience, string> = { none: "Не тренировался", some: "Иногда", regular: "Регулярно" }
export const ACTIVITY_RU: Record<ActivityLevel, string> = { sedentary: "Сидячая", light: "Лёгкая", moderate: "Средняя", high: "Высокая" }
export const INJURY_RU: Record<InjuryTag, string> = { ankle: "Голеностоп", knee: "Колено", lower_back: "Поясница", shoulder: "Плечо", wrist: "Запястье" }

// src/features/program/format.ts  (Задачи 3–5 импортируют отсюда)
export const WEEKDAY_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
export const DAY_RU: Record<DayType, string> = { A: "Full-body A", B: "Full-body B", U: "Верх", L: "Низ" }
export const BLOCK_RU: Record<Block, string> = { warmup: "Разминка", main: "Основная", finisher: "Финишер", cooldown: "Заминка" }
export const fmtDate = (iso: string) => parseISO(iso).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })
export const dose = (e: PlannedExercise) => e.reps ? `${e.sets}×${e.reps[0]}${e.reps[1] > e.reps[0] ? `–${e.reps[1]}` : ""}` : `${e.sets}×${e.durationS} с`
export const trainingDays = (days: 2 | 3 | 4) => WEEKDAYS[days].map((d) => WEEKDAY_RU[d]).join(", ")   // "Пн, Ср, Пт"

// src/features/program/model.ts
export function newConfig(profile: ProfileInput, baseline: TestInput, startDate: string, seed: string): StoredConfig
// → { profile, baseline, latestTest: baseline, startDate, seed, generatorVersion: 1, blockIndex: 0, blockStart: startDate }
export const profileInput = (p: Pick<Profile, "sex" | "birth_year" | "goal" | "experience" | "days_per_week" | "session_min" | "injuries" | "equipment">): ProfileInput =>
  ({ sex: p.sex, birth_year: p.birth_year, goal: p.goal, experience: p.experience, days_per_week: p.days_per_week, session_min: p.session_min, injuries: p.injuries, equipment: p.equipment })   // Profile row → ProfileInput движка (используют Task 7 и Task 10)

// src/features/checkpoints/testDraft.ts  (общий черновик теста для онбординга и чекпоинта)
export interface TestDraft { pushups?: number; squats?: number; plank_s?: number; knee_to_wall_diff_cm?: number; single_leg_calf_raises?: number; balance_eyes_closed_s?: number }
export function completeTest(v: TestDraft, withAnkle: boolean): TestRow["results"] | null
// null, пока не заполнены pushups/squats/plank_s (0 допустим) и — при withAnkle — все три поля голеностопа; иначе { pushups, squats, plank_s, ankle? }

// src/features/onboarding/draft.ts
export const STEPS = ["about", "goal", "regime", "equipment", "injuries", "test", "summary"] as const
export interface OnboardingDraft {
  step: number
  sex?: Sex; birth_year?: number; height_cm?: number; weight_kg?: number
  goal?: Goal; experience?: Experience; activity_level?: ActivityLevel
  days_per_week?: 2 | 3 | 4; session_min?: 20 | 30 | 45
  equipment: EquipmentTag[]; injuries: InjuryTag[]
  test?: TestRow["results"]
}
export const emptyDraft = (): OnboardingDraft => ({ step: 0, equipment: ["mat"], injuries: [] })
export function stepValid(d: OnboardingDraft, step: number): boolean
export const draftComplete = (d: OnboardingDraft) => STEPS.slice(0, 6).every((_, i) => stepValid(d, i))
export interface OnboardingContext { userId: string; today: string; timezone: string; seed: string }
export interface OnboardingRows { profile: Upsertable<"profiles">; metric: Upsertable<"body_metrics">; test: Upsertable<"tests">; program: ProgramRows }
export function onboardingRows(d: OnboardingDraft, ctx: OnboardingContext, exercises: Exercise[]): OnboardingRows
export const useOnboarding = create<{ draft: OnboardingDraft; patch(p: Partial<OnboardingDraft>): void; reset(): void }>()(persist(…, { name: "forma-onboarding" }))

// src/components
export function Disclaimer({ className }: { className?: string })   // одна фраза: «Не медицинская рекомендация. При боли, травме или хронических заболеваниях согласуй нагрузку с врачом.»
export function Rating({ value, onChange, min = 1, max = 5, labels }: { value?: number; onChange: (v: number) => void; min?: number; max?: number; labels?: [string, string] })   // ряд кнопок min…max, aria-pressed, подписи под крайними
export function ChoiceGroup<T extends string>({ value, onChange, options, columns = 1 }: { value?: T; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; columns?: 1 | 2 | 3 })   // одиночный выбор карточками-кнопками (role="radiogroup")
export function MultiChoice<T extends string>({ value, onChange, options, columns = 2 }: { value: T[]; onChange: (v: T[]) => void; options: { value: T; label: string; hint?: string }[]; columns?: 1 | 2 | 3 })   // в том же файле ChoiceGroup.tsx; чекбокс-карточки
export function EmptyState({ icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode })
```

Правила `stepValid`: 0 — `sex`, `birth_year ∈ [1920, 2020]`, `height_cm ∈ [120, 230]`, `weight_kg ∈ [30, 300]`; 1 — `goal`; 2 — `experience`, `activity_level`, `days_per_week`, `session_min`; 3 и 4 — всегда `true` (пустой инвентарь = тело + стул/стена); 5 — `test` задан и (`injuries` не содержит `"ankle"` или `test.ankle` задан); 6 — `draftComplete(d)`.

`onboardingRows`: `profile = { id: ctx.userId, sex, birth_year, height_cm, country: "BY", timezone: ctx.timezone, goal, experience, days_per_week, session_min, activity_level, injuries, equipment, figure: sex }`; `metric = { id: metricId(userId, today), date: today, weight_kg, waist_cm: null, neck_cm: null, hip_cm: null }`; `test = { id: testId(userId, today, "baseline"), date: today, kind: "baseline", results: d.test }`; `program = buildProgram(newConfig(profileInput(d as Required<OnboardingDraft>), { ...d.test, date: today }, today, ctx.seed), exercises, [])` (`profileInput` из `model.ts`; у полного черновика те же восемь полей, что у `Profile`). Бросает `Error("draft incomplete")`, если `!draftComplete(d)`.

- [ ] **Step 1: `format.ts` — тест** (`format.test.ts`):

```ts
import { dose, fmtDate, trainingDays } from "./format"
it("dose prints sets×reps or sets×seconds", () => {
  expect(dose({ slug: "x", block: "main", sets: 3, reps: [8, 12], targetRir: 4, restS: 60 })).toBe("3×8–12")
  expect(dose({ slug: "x", block: "main", sets: 2, reps: [10, 10], targetRir: 4, restS: 60 })).toBe("2×10")
  expect(dose({ slug: "x", block: "warmup", sets: 1, durationS: 30, targetRir: 5, restS: 0 })).toBe("1×30 с")
})
it("fmtDate is a short Russian date; trainingDays lists the weekdays", () => {
  expect(fmtDate("2026-10-12")).toMatch(/^пн, 12 окт/)
  expect(trainingDays(3)).toBe("Пн, Ср, Пт")
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/program/format.test.ts` → FAIL (module missing). **Step 3:** создать `format.ts` (см. Produces), в `DevPreviewPage.tsx` удалить локальные `BLOCK_RU`, `DAY_RU`, `fmtDate`, `dose` и импортировать их из `@/features/program/format` (`mainSets` остаётся локальным). **Step 4: Run** `npx vitest run src/features/program/format.test.ts && npm run typecheck` → PASS. Commit `feat(program): shared format helpers`.

- [ ] **Step 5: `labels.ts` + `newConfig` — тест** (в `model.test.ts` добавить):

```ts
import { GOAL_RU, EXPERIENCE_RU, ACTIVITY_RU, INJURY_RU } from "@/content/labels"
import { newConfig } from "./model"
import { ownerBaseline, ownerProfile } from "./engine/fixtures/owner"
it("labels cover every enum value", () => {
  expect(Object.keys(GOAL_RU).sort()).toEqual(["fat", "muscle", "tone"])
  expect(Object.keys(EXPERIENCE_RU).sort()).toEqual(["none", "regular", "some"])
  expect(Object.keys(ACTIVITY_RU).sort()).toEqual(["high", "light", "moderate", "sedentary"])
  expect(Object.keys(INJURY_RU).sort()).toEqual(["ankle", "knee", "lower_back", "shoulder", "wrist"])
})
it("newConfig starts block 0 at startDate with the baseline as latest test", () => {
  const cfg = newConfig(ownerProfile, ownerBaseline, "2026-10-12", "s")
  expect(cfg).toEqual({ profile: ownerProfile, baseline: ownerBaseline, latestTest: ownerBaseline, startDate: "2026-10-12", seed: "s", generatorVersion: 1, blockIndex: 0, blockStart: "2026-10-12" })
})
```

- [ ] **Step 6: Run** `npx vitest run src/features/program/model.test.ts` → FAIL. **Step 7:** добавить константы в `labels.ts`, `newConfig` и `profileInput` в `model.ts`. **Step 8: Run** → PASS. Commit `feat(onboarding): enum labels and newConfig`.

- [ ] **Step 9: `testDraft.ts` — тест** (`testDraft.test.ts`):

```ts
import { completeTest } from "./testDraft"
it("completeTest needs the three base fields, zero counts as filled", () => {
  expect(completeTest({ pushups: 0, squats: 10 }, false)).toBeNull()
  expect(completeTest({ pushups: 0, squats: 10, plank_s: 20 }, false)).toEqual({ pushups: 0, squats: 10, plank_s: 20 })
})
it("completeTest with ankle requires all three ankle fields and nests them", () => {
  const base = { pushups: 12, squats: 25, plank_s: 40, knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12 }
  expect(completeTest(base, true)).toBeNull()
  expect(completeTest({ ...base, balance_eyes_closed_s: 15 }, true)).toEqual({ pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } })
  expect(completeTest({ ...base, balance_eyes_closed_s: 15 }, false)).toEqual({ pushups: 12, squats: 25, plank_s: 40 })
})
```

- [ ] **Step 10: Run** → FAIL. **Step 11:** реализовать `completeTest`. **Step 12: Run** → PASS. Commit `feat(checkpoints): test draft completion`.

- [ ] **Step 13: `draft.ts` — тесты** (`draft.test.ts`):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { ownerBaseline } from "@/features/program/engine/fixtures/owner"
import { draftComplete, emptyDraft, onboardingRows, stepValid, type OnboardingDraft } from "./draft"

const full: OnboardingDraft = {
  step: 6, sex: "male", birth_year: 1990, height_cm: 180, weight_kg: 82, goal: "fat", experience: "some",
  activity_level: "light", days_per_week: 3, session_min: 30,
  equipment: ["dumbbell", "band", "mat", "rope", "roller", "ball"], injuries: ["ankle"],
  test: { pushups: 12, squats: 25, plank_s: 40, ankle: ownerBaseline.ankle },
}
it("stepValid checks each step's required fields", () => {
  const d = emptyDraft()
  expect(d.equipment).toEqual(["mat"])
  expect(stepValid(d, 0)).toBe(false)
  expect(stepValid({ ...d, sex: "female", birth_year: 1995, height_cm: 165, weight_kg: 60 }, 0)).toBe(true)
  expect(stepValid({ ...d, sex: "female", birth_year: 1800, height_cm: 165, weight_kg: 60 }, 0)).toBe(false)
  expect(stepValid(d, 1)).toBe(false)
  expect(stepValid({ ...d, goal: "tone" }, 1)).toBe(true)
  expect(stepValid(d, 2)).toBe(false)
  expect(stepValid({ ...d, experience: "none", activity_level: "sedentary", days_per_week: 2, session_min: 20 }, 2)).toBe(true)
  expect(stepValid(d, 3)).toBe(true)
  expect(stepValid(d, 4)).toBe(true)
  expect(stepValid({ ...full, test: { pushups: 12, squats: 25, plank_s: 40 } }, 5)).toBe(false)
  expect(stepValid({ ...full, injuries: [], test: { pushups: 12, squats: 25, plank_s: 40 } }, 5)).toBe(true)
  expect(draftComplete(full)).toBe(true)
  expect(draftComplete({ ...full, goal: undefined })).toBe(false)
})
it("onboardingRows builds profile, metric, baseline test and an active program", () => {
  const ctx = { userId: "local", today: "2026-10-12", timezone: "Europe/Minsk", seed: "seed-1" }
  const r = onboardingRows(full, ctx, exercises)
  expect(r.profile).toEqual({ id: "local", sex: "male", birth_year: 1990, height_cm: 180, country: "BY", timezone: "Europe/Minsk", goal: "fat", experience: "some", days_per_week: 3, session_min: 30, activity_level: "light", injuries: ["ankle"], equipment: full.equipment, figure: "male" })
  expect(r.metric).toMatchObject({ date: "2026-10-12", weight_kg: 82, waist_cm: null })
  expect(r.test).toMatchObject({ date: "2026-10-12", kind: "baseline", results: full.test })
  expect(r.program.program).toMatchObject({ start_date: "2026-10-12", goal: "fat", template: "fullbody", active: true })
  expect(r.program.sessions).toHaveLength(12)
  expect(r.program.sessions[0].date).toBe("2026-10-12")
  expect(onboardingRows(full, { ...ctx, seed: "seed-1" }, exercises).program.sessions.map((s) => s.exercises)).toEqual(r.program.sessions.map((s) => s.exercises))
  expect(() => onboardingRows({ ...full, test: undefined }, ctx, exercises)).toThrow("draft incomplete")
})
```

- [ ] **Step 14: Run** `npx vitest run src/features/onboarding/draft.test.ts` → FAIL. **Step 15:** `draft.ts`: `STEPS`, `emptyDraft`, `stepValid`, `draftComplete` → Run → PASS → commit `feat(onboarding): draft validation`; затем `onboardingRows` + стор `useOnboarding` (persist `"forma-onboarding"`, `patch` сливает, `reset` → `emptyDraft()`) → Run → PASS → commit `feat(onboarding): rows from a finished draft`. `id` программы внутри `buildProgram` — `newId()` по умолчанию (в тесте не фиксируется).

- [ ] **Step 16: Общие компоненты** — `Disclaimer`, `Rating`, `ChoiceGroup`/`MultiChoice`, `EmptyState` (см. Produces). `Rating`: `<div role="radiogroup">` из `Button variant={v === value ? "default" : "outline"} size="icon"`; `ChoiceGroup`: кнопки `w-full rounded-lg border p-3 text-left`, активная — `border-primary bg-primary/5`, `hint` серым под `label`; `MultiChoice` — те же карточки с иконкой `Check` при выборе; `EmptyState` — иконка в круге, заголовок, текст, слот действия, по центру. Run `npm run lint && npm run typecheck` → PASS. Commit `feat(ui): disclaimer, rating, choice groups, empty state`.

- [ ] **Step 17: `TestForm.tsx`** — `TestForm({ value, onChange, withAnkle }: { value: TestDraft; onChange: (v: TestDraft) => void; withAnkle: boolean })`: три `Input type="number" inputMode="numeric"` с `Label` («Отжимания за подход, раз» — подсказка «до отказа техники, с колен — если меньше 5»; «Приседания за подход, раз»; «Планка, секунд»); при `withAnkle` — `Separator`, подзаголовок «Голеностоп (чекпоинт разблокировки прыжков)» и три поля: «Knee-to-wall: разница между ногами, см» (`step="0.5"`), «Подъёмы на носок на одной ноге, раз», «Баланс на одной ноге с закрытыми глазами, с»; под ними `<Disclaimer />`. Пустая строка → `undefined` в черновике. Commit `feat(checkpoints): shared test form`.

- [ ] **Step 18: Шаги онбординга** — каждый шаг `({ d, patch }: { d: OnboardingDraft; patch: (p: Partial<OnboardingDraft>) => void })`:
  - `StepAbout`: `ChoiceGroup` пол («Мужчина» / «Женщина», `columns=2`), `Input` год рождения, рост (см), вес (кг).
  - `StepGoal`: `ChoiceGroup` по `GOAL_RU` с hint: fat — «Короткие силовые + дефицит калорий»; muscle — «Больше подходов, профицит калорий»; tone — «Поддержка формы и подвижность».
  - `StepRegime`: `ChoiceGroup` опыт (`EXPERIENCE_RU`), активность (`ACTIVITY_RU`, hint: «офис, мало ходьбы» / «прогулки, 1–2 активности» / «на ногах полдня» / «физический труд»), дней в неделю 2/3/4 (hint `trainingDays(n)`), длительность 20/30/45 мин (`columns=3`).
  - `StepEquipment`: `MultiChoice` по `EQUIPMENT_RU` без `chair`/`wall` (всегда доступны — одна строка текста под списком).
  - `StepInjuries`: `MultiChoice` по `INJURY_RU` + текст «Упражнения с противопоказанием исключаются; голеностоп дополнительно блокирует прыжки до чекпоинта».
  - `StepTest`: вводный текст («Разминка 3 минуты, затем три подхода до отказа техники с отдыхом 2 минуты»), `TestForm` с локальным `TestDraft` (`useState`), `withAnkle = d.injuries.includes("ankle")`; при каждом изменении `patch({ test: completeTest(v, withAnkle) ?? undefined })`.
  - `StepSummary`: карточка «Твоя программа»: цель `GOAL_RU`, `days_per_week` дня — `trainingDays`, `session_min` мин, первая тренировка `fmtDate(today)` (или ближайший день — берётся из `onboardingRows(...).program.sessions[0].date`, вычисление в `useMemo`), «Недели 1–2 — лёгкие по ощущениям (RIR 4–5): так ты не сорвёшься на крепатуре», при `injuries` с ankle — «Прыжки и скакалка появятся после чекпоинта»; `<Disclaimer />`.
  Commit после каждых 2–3 шагов: `feat(onboarding): steps about, goal, regime`, `feat(onboarding): steps equipment, injuries, test, summary`.

- [ ] **Step 19: `OnboardingPage.tsx`** — шапка «Шаг N из 7» + `Progress value={(step+1)/7*100}`; текущий шаг по `STEPS[d.step]`; кнопки «Назад» (`variant="ghost"`, скрыта на шаге 0) и «Дальше» (`disabled={!stepValid(d, d.step)}`); на шаге summary — кнопка «Начать программу»: `const ctx = { userId: useDb.getState().userId, today: todayISO(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, seed: newId() }`, `rows = onboardingRows(d, ctx, exercises)`; `upsert("profiles", rows.profile)`, `upsert("body_metrics", rows.metric)`, `upsert("tests", rows.test)`, `upsert("programs", rows.program.program)`, каждую сессию `upsert("planned_sessions", s)`; `reset()`; `navigate("/", { replace: true })`. Если профиль уже есть (`useDb(s => s.rows.profiles[s.userId])`) — страница показывает `EmptyState` «Анкета уже заполнена» с кнопкой «На главную» (перезапуск программы — в профиле, Task 10). Маршрут `{ path: "onboarding", element: <OnboardingPage /> }`; `AppLayout`: `const { pathname } = useLocation(); const bare = pathname.startsWith("/onboarding") || pathname.startsWith("/workout")` → `BottomNav` не рендерится, `pb-20` заменяется на `pb-6` при `bare`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(onboarding): wizard page and route`.

- [ ] **Step 20: Скриншоты** — dev-сервер уже запущен (`http://localhost:5173/forma/`). Playwright: открыть `/forma/onboarding`, телефон 390×844 DPR 3 (CDP `Emulation.setDeviceMetricsOverride {width:390,height:844,deviceScaleFactor:3,mobile:true}`), пройти все 7 шагов с данными владельца, скриншоты `_screens/onb-1.png … onb-7.png`; нажать «Начать программу» → проверить в `localStorage["forma-db"]` 1 профиль, 1 замер, 1 тест, 1 программа, 12 сессий; `Emulation.clearDeviceMetricsOverride`. Expected: ни одного шага без кнопки «Дальше» в видимой области; текст без переносов посередине слов. Проблемы вёрстки править сразу (отдельный коммит `fix(onboarding): …`). Удалить `_screens/onb-*.png`.

- [ ] **Step 21: Run** `npm test` → PASS (все). Финальный коммит задачи, если остались правки.

---
### Task 3: Тренировка — черновик, лог подходов, таймер, завершение

**Files:**
- Create: `src/features/workout/activeWorkout.ts`, `src/features/workout/activeWorkout.test.ts`, `src/features/workout/useStartWorkout.ts`, `src/features/workout/ResumeDialog.tsx`, `src/features/workout/WorkoutPage.tsx`, `src/features/workout/ExerciseBlock.tsx`, `src/features/workout/SetRow.tsx`, `src/features/workout/RestTimer.tsx`, `src/features/workout/useCountdown.ts`, `src/features/workout/useWakeLock.ts`, `src/features/workout/FinishSheet.tsx`
- Modify: `src/app/router.tsx` (+ `workout/:id`)

**Interfaces:**
- Consumes: `prepareSession` (`prepare.ts`), `toSessionPlan`, `toPlannedRow`, `setId`, `isoDate` (`model.ts`), `activeProgram`, `storedConfig`, `historyFor` (`programService.ts`), `autoregulate`, `needsEasing`, `EASED_NOTE`, `estimateMinutes`, типы `SessionPlan`, `PlannedExercise`, `SetLog`, `CheckIn`, `Block` (`engine`), `DAY_RU`, `BLOCK_RU`, `dose`, `fmtDate` (`format.ts`), `Rows`, `Upsertable`, `useDb` (`@/lib/db`), `PlannedSession`, `Workout` (`@/lib/schema`), `newId`, `Rating`, `EmptyState`, `bySlug`, `all as exercises`.
- Produces:
```ts
// activeWorkout.ts — чистые функции + persist-стор
export interface ActiveWorkout {
  workoutId: string; plannedSessionId: string
  /** the plan actually shown: prepared, then eased by the check-in when needed */
  plan: SessionPlan
  startedAt: string                       // ISO timestamp
  sets: Record<string, SetLog>            // key = setKey(slug, setNo); only LOGGED blocks
  done: string[]                          // warm-up / cool-down slugs ticked off (draft only, not stored)
  restUntil: number | null                // epoch ms
}
export const LOGGED: Block[] = ["main", "finisher"]
export const setKey = (slug: string, setNo: number) => `${slug}#${setNo}`
export function setRow(workoutId: string, s: SetLog): Upsertable<"workout_sets">
// { id: setId(workoutId, s.slug, s.setNo), workout_id: workoutId, exercise_id: s.slug, set_no: s.setNo, reps: s.reps ?? null, duration_s: s.durationS ?? null, weight_kg: s.weightKg ?? null, band_kg: null, rir: s.rir ?? null }
export function planForStart(rows: Rows, plannedId: string, checkIn: CheckIn | null, exercises: Exercise[]): { prepared: SessionPlan; plan: SessionPlan } | undefined
// row = rows.planned_sessions[plannedId], program = activeProgram(rows); undefined без любого из них
// prepared = prepareSession(toSessionPlan(row), historyFor(rows), storedConfig(program), exercises)
// plan = checkIn && needsEasing(checkIn) ? autoregulate(prepared, checkIn) : prepared
export function startWorkout(row: PlannedSession, prepared: SessionPlan, plan: SessionPlan, checkIn: CheckIn | null, now: Date, id = newId()): { workout: Upsertable<"workouts">; draft: ActiveWorkout; plannedRow: Upsertable<"planned_sessions"> }
// workout = { id, planned_session_id: row.id, started_at: now.toISOString(), finished_at: null, pre_soreness: checkIn?.soreness ?? null, pre_sleep: checkIn?.sleep ?? null, pre_energy: checkIn?.energy ?? null, rpe: null, notes: null }
// plannedRow = toPlannedRow(prepared, row.program_id)  — в план записывается ПОДГОТОВЛЕННЫЙ (прогрессия), не облегчённый
// draft = { workoutId: id, plannedSessionId: row.id, plan, startedAt: now.toISOString(), sets: {}, done: [], restUntil: null }
export function nextSet(d: ActiveWorkout): { slug: string; setNo: number } | undefined   // по порядку упражнений LOGGED-блоков, setNo 1..sets, первый не залогированный
export function progress(d: ActiveWorkout): { done: number; total: number }             // залогировано / всего сетов LOGGED-блоков
export function logSet(d: ActiveWorkout, s: SetLog, nowMs: number): ActiveWorkout
// sets[setKey] = s; restUntil = есть следующий сет && restS > 0 ? nowMs + restS*1000 : null (restS — у упражнения с этим slug в d.plan)
export const toggleDone = (d: ActiveWorkout, slug: string): ActiveWorkout
export function completeWorkout(w: Workout, rpe: number | null, notes: string | null, now: Date): Upsertable<"workouts">   // { ...w, finished_at: now.toISOString(), rpe, notes: notes?.trim() || null }
export const ABORT_NOTE = "Прервано"
export function abortWorkout(w: Workout, loggedSets: number, now: Date): Upsertable<"workouts"> | null   // ≥1 сет → { ...w, finished_at, notes: ABORT_NOTE }; 0 → null (строка остаётся незавершённой, historyFor её игнорирует)
export function resumeDecision(draft: ActiveWorkout | null, req: { workoutId: string } | { plannedId: string }): "continue" | "ask" | "none"
export const useActiveWorkout = create<{ draft: ActiveWorkout | null; set(d: ActiveWorkout | null): void }>()(persist(…, { name: "forma-active-workout" }))

// useStartWorkout.ts (хук; Задачи 4 и 5 стартуют тренировку только через него)
export function useStartWorkout(): { start(plannedId: string, checkIn: CheckIn | null): void; conflict: ActiveWorkout | null; continueActive(): void; abortActive(): void; dismiss(): void }
// start: есть черновик той же сессии → navigate(`/workout/${draft.workoutId}`); другой сессии → conflict = draft (запрос запоминается); нет → planForStart → startWorkout → upsert("workouts"), upsert("planned_sessions", plannedRow), useActiveWorkout.set(draft), navigate(`/workout/${id}`); planForStart === undefined → toast.error("Сессия не найдена")
// abortActive: abortWorkout(rows.workouts[draft.workoutId], Object.keys(draft.sets).length, new Date()) → upsert если не null; set(null); затем выполняет запомненный start
// ResumeDialog.tsx: ResumeDialog({ conflict, onContinue, onAbort, onClose }) — Dialog «Есть незавершённая тренировка от {fmtDate(isoDate(conflict.startedAt))}», кнопки «Продолжить её» / «Прервать и начать новую»

// useCountdown.ts
export function useNow(intervalMs = 1000): number           // Date.now(), тикает
export function useCountdown(until: number | null): number   // оставшиеся секунды ≥ 0 (ceil), тик 250 мс, 0 когда until null
// useWakeLock.ts
export function useWakeLock(): void                          // navigator.wakeLock?.request("screen") при монтировании и на visibilitychange→visible; release при размонтировании; ошибки глушатся
```

- [ ] **Step 1: Тесты чистых функций** (`activeWorkout.test.ts`):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { EASED_NOTE } from "@/features/program/engine"
import { programRows } from "@/features/program/engine/fixtures/rows"
import { toPlannedRow } from "@/features/program/model"
import { plannedSessions } from "@/features/program/programService"
import type { Workout } from "@/lib/schema"
import { abortWorkout, completeWorkout, LOGGED, logSet, nextSet, planForStart, progress, resumeDecision, setKey, setRow, startWorkout, toggleDone } from "./activeWorkout"

const rows = programRows()
const first = plannedSessions(rows, "p1")[0]
const row = rows.planned_sessions[first.id]
const now = new Date(2026, 9, 12, 18, 0)
const sore = { soreness: 5, sleep: 4, energy: 4 }
const eased = (p: { exercises: { note?: string }[] }) => p.exercises.some((e) => e.note?.includes(EASED_NOTE))

it("setRow maps a logged set to a deterministic workout_sets row", () => {
  const r = setRow("w1", { slug: "push-up", setNo: 2, reps: 10, rir: 4 })
  expect(r).toEqual({ id: setRow("w1", { slug: "push-up", setNo: 2 }).id, workout_id: "w1", exercise_id: "push-up", set_no: 2, reps: 10, duration_s: null, weight_kg: null, band_kg: null, rir: 4 })
  expect(setKey("push-up", 2)).toBe("push-up#2")
})
it("planForStart prepares the plan and eases it only when the check-in asks", () => {
  expect(planForStart(rows, "missing", null, exercises)).toBeUndefined()
  const calm = planForStart(rows, first.id, { soreness: 2, sleep: 4, energy: 4 }, exercises)!
  expect(calm.plan).toEqual(calm.prepared)
  expect(calm.prepared).toEqual(first)
  const tired = planForStart(rows, first.id, sore, exercises)!
  expect(eased(tired.prepared)).toBe(false)
  expect(eased(tired.plan)).toBe(true)
})
it("startWorkout returns the workout row, the draft with the eased plan and the prepared planned row", () => {
  const { prepared, plan } = planForStart(rows, first.id, sore, exercises)!
  const r = startWorkout(row, prepared, plan, sore, now, "w1")
  expect(r.workout).toEqual({ id: "w1", planned_session_id: first.id, started_at: now.toISOString(), finished_at: null, pre_soreness: 5, pre_sleep: 4, pre_energy: 4, rpe: null, notes: null })
  expect(r.draft).toEqual({ workoutId: "w1", plannedSessionId: first.id, plan, startedAt: now.toISOString(), sets: {}, done: [], restUntil: null })
  expect(r.plannedRow).toEqual(toPlannedRow(prepared, "p1"))
  expect(eased(r.plannedRow as { exercises: { note?: string }[] })).toBe(false)
})
it("nextSet / logSet / progress walk the logged blocks in order", () => {
  const { prepared, plan } = planForStart(rows, first.id, null, exercises)!
  let d = startWorkout(row, prepared, plan, null, now, "w1").draft
  const logged = plan.exercises.filter((e) => LOGGED.includes(e.block))
  const total = logged.reduce((n, e) => n + e.sets, 0)
  expect(progress(d)).toEqual({ done: 0, total })
  expect(nextSet(d)).toEqual({ slug: logged[0].slug, setNo: 1 })
  d = logSet(d, { slug: logged[0].slug, setNo: 1, reps: 10, rir: 4 }, 1000)
  expect(d.sets[setKey(logged[0].slug, 1)]).toEqual({ slug: logged[0].slug, setNo: 1, reps: 10, rir: 4 })
  expect(d.restUntil).toBe(1000 + logged[0].restS * 1000)
  expect(progress(d).done).toBe(1)
  expect(nextSet(d)).not.toEqual({ slug: logged[0].slug, setNo: 1 })
  for (const e of logged) for (let n = 1; n <= e.sets; n++) d = logSet(d, { slug: e.slug, setNo: n, reps: 8 }, 2000)
  expect(nextSet(d)).toBeUndefined()
  expect(d.restUntil).toBeNull()
  expect(progress(d)).toEqual({ done: total, total })
  expect(toggleDone(d, "x").done).toEqual(["x"])
  expect(toggleDone(toggleDone(d, "x"), "x").done).toEqual([])
})
it("completeWorkout / abortWorkout", () => {
  const w: Workout = { id: "w1", user_id: "local", created_at: "", updated_at: "", planned_session_id: first.id, started_at: now.toISOString(), finished_at: null, pre_soreness: null, pre_sleep: null, pre_energy: null, rpe: null, notes: null }
  const end = new Date(2026, 9, 12, 18, 31)
  expect(completeWorkout(w, 7, "  норм ", end)).toMatchObject({ id: "w1", finished_at: end.toISOString(), rpe: 7, notes: "норм" })
  expect(completeWorkout(w, null, "", end).notes).toBeNull()
  expect(abortWorkout(w, 0, end)).toBeNull()
  expect(abortWorkout(w, 2, end)).toMatchObject({ finished_at: end.toISOString(), notes: "Прервано" })
})
it("resumeDecision: continue the same workout or session, ask about another, none without a draft", () => {
  const { prepared, plan } = planForStart(rows, first.id, null, exercises)!
  const d = startWorkout(row, prepared, plan, null, now, "w1").draft
  expect(resumeDecision(null, { workoutId: "w1" })).toBe("none")
  expect(resumeDecision(d, { workoutId: "w1" })).toBe("continue")
  expect(resumeDecision(d, { workoutId: "w2" })).toBe("ask")
  expect(resumeDecision(d, { plannedId: first.id })).toBe("continue")
  expect(resumeDecision(d, { plannedId: "other" })).toBe("ask")
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/workout/activeWorkout.test.ts` → FAIL (module missing). **Step 3:** реализовать по одной функции, коммит после каждого зелёного прогона своего `it`: `setKey`+`setRow` (`feat(workout): set rows`), `planForStart` (`feat(workout): plan for start`), `startWorkout` (`feat(workout): start workout rows and draft`), `nextSet`+`progress`+`logSet`+`toggleDone` (`feat(workout): draft reducers`), `completeWorkout`+`abortWorkout` (`feat(workout): finish and abort`), `resumeDecision` + стор `useActiveWorkout` (`feat(workout): resume decision and draft store`). **Step 4: Run** `npx vitest run src/features/workout` → PASS (6 тестов).

- [ ] **Step 5: `useCountdown.ts`, `useWakeLock.ts`** (см. Produces; `useNow` — `useState(Date.now)` + `setInterval`; `useCountdown` возвращает `until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0`). Commit `feat(workout): countdown and wake lock hooks`.

- [ ] **Step 6: `SetRow.tsx`** — `SetRow({ ex, setNo, logged, onLog }: { ex: PlannedExercise; setNo: number; logged?: SetLog; onLog: (s: SetLog) => void })`: строка `grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-2`: номер сета; `Input type="number" inputMode="numeric"` повторы (`aria-label="Повторы"`, placeholder `reps[0]`) или секунды для timed (`ex.durationS` задан; placeholder `durationS`); вес, кг (показан только если `ex.loadKg !== undefined`, placeholder `loadKg`); `Select` RIR 0–5 (по умолчанию `targetRir`); кнопка `Button size="icon"` с `Check` (`aria-label="Сет выполнен"`) → `onLog({ slug: ex.slug, setNo, reps?, durationS?, weightKg?, rir })` — пустое поле повторов/секунд берёт placeholder. Залогированная строка — `bg-muted/60`, кнопка `variant="secondary"`; повторное нажатие перезаписывает (тот же `setId`). Commit `feat(workout): set row`.

- [ ] **Step 7: `ExerciseBlock.tsx`** — `ExerciseBlock({ ex, sets, onLog })`: `Card`: заголовок — `Link to={`/exercises/${ex.slug}`}` с именем из `bySlug` (fallback slug) и `ChevronRight`, строка `dose(ex) · RIR {targetRir}{loadKg ? ` · ${loadKg} кг` : ""}`, `ex.note` серым; тело — `SetRow` для `setNo 1..ex.sets` (`logged = sets[setKey(ex.slug, n)]`). Второй экспорт `ChecklistItem({ ex, done, onToggle })` для разминки/заминки: имя-ссылка, `dose`, `Button variant={done ? "secondary" : "outline"} size="sm"` «Готово»/«✓». Commit `feat(workout): exercise block and checklist item`.

- [ ] **Step 8: `RestTimer.tsx`, `FinishSheet.tsx`** — `RestTimer({ until, onSkip, onExtend }: { until: number; onSkip: () => void; onExtend: (s: number) => void })`: `fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-background p-3` (на md — `max-w-3xl`): «Отдых» + `useCountdown(until)` крупно (`mm:ss`), кнопки «+30 с» и «Пропустить»; при 0 — рендерится `null`. `FinishSheet({ open, onOpenChange, onFinish }: { …; onFinish: (rpe: number | null, notes: string) => void })` — `Drawer` (vaul): заголовок «Как прошло?», `Rating min=1 max=10 labels={["легко", "предел"]}` (RPE), `Input` «Заметка (необязательно)», кнопка «Сохранить тренировку». Commit `feat(workout): rest timer and finish sheet`.

- [ ] **Step 9: `useStartWorkout.ts` + `ResumeDialog.tsx`** (см. Produces). Commit `feat(workout): start hook with resume dialog`.

- [ ] **Step 10: `WorkoutPage.tsx`** (маршрут `/workout/:id`): `draft = useActiveWorkout(s => s.draft)`, `decision = resumeDecision(draft, { workoutId: id })`:
  - `"none"` → `EmptyState icon={Dumbbell} title="Тренировка не найдена" action={<Button asChild><Link to="/">На главную</Link></Button>}`;
  - `"ask"` → `EmptyState title="Идёт другая тренировка" text={fmtDate(isoDate(draft.startedAt))} action={<Button asChild><Link to={`/workout/${draft.workoutId}`}>Перейти к ней</Link></Button>}`;
  - `"continue"` → `useWakeLock()`; шапка: `DAY_RU[plan.dayType]`, `fmtDate(plan.date)`, прошло `mm:ss` от `startedAt` (`useNow`), `Progress` по `progress(draft)` и подпись «{done}/{total} сетов»; секции по блокам в порядке `plan.exercises`: для `warmup`/`cooldown` — `ChecklistItem` (`done` из `draft.done`, `onToggle` → `set(toggleDone(draft, slug))`), для LOGGED — `ExerciseBlock` с `onLog = (s) => { useDb.getState().upsert("workout_sets", setRow(draft.workoutId, s)); set(logSet(draft, s, Date.now())) }`; заголовок секции — `BLOCK_RU`; внизу кнопка «Завершить» (`size="lg" className="w-full"`) → `FinishSheet`; `onFinish` → `upsert("workouts", completeWorkout(rows.workouts[draft.workoutId], rpe, notes, new Date()))`, `set(null)`, `toast.success("Тренировка сохранена")`, `navigate("/", { replace: true })`; кнопка `variant="ghost"` «Прервать» в шапке → `Dialog` подтверждения («Залогированные сеты сохранятся» / «Ничего не сохранится» в зависимости от `progress(draft).done`) → `abortWorkout(...)` → upsert если не null, `set(null)`, `navigate("/")`. `RestTimer` при `draft.restUntil && draft.restUntil > now`: `onSkip` → `set({ ...draft, restUntil: null })`, `onExtend(30)` → `restUntil + 30000`. Отступ снизу `pb-28`, когда таймер виден. Если строки `workouts[draft.workoutId]` нет в `rows` (стёрта при смене аккаунта) — при завершении создать её заново из черновика: `{ id, planned_session_id, started_at: draft.startedAt, finished_at, pre_*: null, rpe, notes }`.
  Маршрут `{ path: "workout/:id", element: <WorkoutPage /> }` (AppLayout уже скрывает `BottomNav` на `/workout/*`). Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(workout): workout page and route`.

- [ ] **Step 11: Run** `npm test` → PASS (все). Визуальная проверка экрана тренировки — в Task 4 Step 12 (нужен экран «Сегодня», чтобы стартовать сессию через чек-ин); здесь только тесты, typecheck, build.

---
### Task 4: Экран «Сегодня» — состояние дня, карточка сессии, чек-ин

**Files:**
- Create: `src/features/today/todayState.ts`, `src/features/today/todayState.test.ts`, `src/features/today/TodayPage.tsx`, `src/features/today/SessionCard.tsx`, `src/features/today/CheckInSheet.tsx`
- Modify: `src/app/router.tsx` (index → `@/features/today/TodayPage`)
- Delete: `src/app/pages/TodayPage.tsx`

**Interfaces:**
- Consumes: `activeProgram`, `plannedSessions`, `finishedByPlanned`, `blockComplete` (`programService.ts`), `ActiveWorkout`, `useActiveWorkout`, `useStartWorkout`, `ResumeDialog` (Task 3), `needsEasing`, `CheckIn`, `SessionPlan`, `PlannedExercise` (`engine`), `DAY_RU`, `BLOCK_RU`, `dose`, `fmtDate` (`format.ts`), `diffDays`, `todayISO` (`@/lib/dates`), `Rows`, `useDb` (`@/lib/db`), `Workout` (`@/lib/schema`), `Rating`, `Disclaimer`, `EmptyState`, `bySlug`.
- Produces:
```ts
// todayState.ts
export type TodayState =
  | { kind: "noProfile" }                                   // → /onboarding
  | { kind: "resume"; draft: ActiveWorkout }                // → /workout/:workoutId
  | { kind: "noProgram" }                                   // профиль есть, активной программы нет → /checkpoint («Пройти тест и собрать программу»)
  | { kind: "done"; plan: SessionPlan; workout: Workout; next?: SessionPlan }   // сегодняшняя сессия завершена; next — первая незавершённая с date > today
  | { kind: "session"; plan: SessionPlan }                  // сегодня есть незавершённая сессия
  | { kind: "blockDone" }                                   // blockComplete → /checkpoint
  | { kind: "missed"; plan: SessionPlan; next?: SessionPlan }   // нет сессии сегодня; последняя незавершённая прошедшая, не старше 6 дней (diffDays(plan.date, today) <= 6)
  | { kind: "rest"; next?: SessionPlan }
export function todayState(rows: Rows, userId: string, draft: ActiveWorkout | null, today: string): TodayState
// порядок проверок: profiles[userId] нет → noProfile; draft → resume; activeProgram нет → noProgram; сессия на today: finished → done, иначе session; blockComplete → blockDone; missed; rest

// SessionCard.tsx (используется календарём в Task 5)
export function SessionCard({ plan, title, action }: { plan: SessionPlan; title?: string; action?: ReactNode })
// Card: заголовок title ?? DAY_RU[plan.dayType], описание `${fmtDate(plan.date)} · ≈${plan.estMin} мин · неделя ${plan.week}`; упражнения группами по блоку (подзаголовок BLOCK_RU), строка: имя-ссылка на /exercises/:slug, справа dose(e) и «RIR n» для main; note серым; action внизу

// CheckInSheet.tsx (используется календарём в Task 5)
export function CheckInSheet({ plan, open, onOpenChange }: { plan: SessionPlan | null; open: boolean; onOpenChange: (o: boolean) => void })
// Drawer «Как самочувствие?»: три Rating 1–5 — «Крепатура / боль» ["нет", "сильная"], «Сон» ["плохо", "отлично"], «Энергия» ["нет сил", "полон сил"]; подпись при needsEasing: «Сегодня облегчим: на сет меньше, RIR +1»; кнопка «Начать» → start(plan.id, checkIn); ссылка-кнопка «Пропустить чек-ин» → start(plan.id, null); внутри — useStartWorkout + ResumeDialog по conflict
```

- [ ] **Step 1: Тест** (`todayState.test.ts`):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { finishSession, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { plannedSessions } from "@/features/program/programService"
import { planForStart, startWorkout, type ActiveWorkout } from "@/features/workout/activeWorkout"
import { emptyRows, type Rows } from "@/lib/db"
import { todayState } from "./todayState"

const S = (rows: Rows, today: string, draft: ActiveWorkout | null = null) => todayState(rows, "local", draft, today)

it("noProfile without a profile row, noProgram without an active program", () => {
  expect(S(emptyRows(), "2026-10-12")).toEqual({ kind: "noProfile" })
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  expect(S(rows, "2026-10-12")).toEqual({ kind: "noProgram" })
})
it("session today → resume with a draft → done after finishing", () => {
  const rows = programRows()
  const [a, b] = plannedSessions(rows, "p1")
  expect(S(rows, "2026-10-12")).toEqual({ kind: "session", plan: a })
  const { prepared, plan } = planForStart(rows, a.id, null, exercises)!
  const draft = startWorkout(rows.planned_sessions[a.id], prepared, plan, null, new Date(2026, 9, 12, 18), "w1").draft
  expect(S(rows, "2026-10-12", draft)).toEqual({ kind: "resume", draft })
  finishSession(rows, a.id, "2026-10-12T18:00:00.000Z", [])
  expect(S(rows, "2026-10-12")).toMatchObject({ kind: "done", plan: a, next: b, workout: { id: `w-${a.id}` } })
})
it("rest with the next session; a miss within 6 days is offered, older ones are not", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1") // 10-12, 10-14, 10-16, 10-19, 10-21, 10-23, …
  expect(S(rows, "2026-10-13")).toEqual({ kind: "missed", plan: s[0], next: s[1] })
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [])
  expect(S(rows, "2026-10-13")).toEqual({ kind: "rest", next: s[1] })
  expect(S(rows, "2026-10-20")).toMatchObject({ kind: "missed", plan: s[3], next: s[4] })
  for (const x of s.slice(1)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  rows.workouts[`w-${s[1].id}`].finished_at = null
  expect(S(rows, "2026-10-20")).toMatchObject({ kind: "missed", plan: s[1] })   // 6 days old
  expect(S(rows, "2026-10-22")).toEqual({ kind: "rest" })                        // 8 days old → rest, nothing next
})
it("blockDone after the last date or when every session is finished; today's finished session wins", () => {
  const rows = programRows()
  expect(S(rows, "2026-11-06")).toMatchObject({ kind: "session" })
  expect(S(rows, "2026-11-07")).toEqual({ kind: "blockDone" })
  for (const x of plannedSessions(rows, "p1")) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(S(rows, "2026-11-05")).toEqual({ kind: "blockDone" })
  expect(S(rows, "2026-11-06")).toMatchObject({ kind: "done", next: undefined })
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/today` → FAIL (module missing). **Step 3:** реализовать `todayState` (одна функция, ранние `return`). **Step 4: Run** → PASS. Commit `feat(today): today state`.

- [ ] **Step 5: `SessionCard.tsx`** (см. Produces). Commit `feat(today): session card`.

- [ ] **Step 6: `CheckInSheet.tsx`** (см. Produces; состояние трёх оценок локальное, по умолчанию `undefined` → кнопка «Начать» активна только при трёх оценках; «Пропустить чек-ин» активна всегда). Commit `feat(today): check-in sheet`.

- [ ] **Step 7: `TodayPage.tsx`** — `const rows = useDb(s => s.rows); const userId = useDb(s => s.userId); const draft = useActiveWorkout(s => s.draft); const today = todayISO(); const st = useMemo(() => todayState(rows, userId, draft, today), [...])`. Заголовок `h1` «Сегодня» + `fmtDate(today)` серым. По `st.kind`:
  - `noProfile` → `EmptyState icon={ClipboardList} title="Начнём с анкеты" text="5 минут: цель, режим, инвентарь и короткий тест" action={<Button asChild><Link to="/onboarding">Заполнить анкету</Link></Button>}`
  - `resume` → `Card` «Тренировка не закончена» (`fmtDate(isoDate(draft.startedAt))`, `progress(draft).done` сетов) + `Button asChild <Link to={`/workout/${draft.workoutId}`}>Продолжить</Link>`
  - `noProgram` → `EmptyState icon={Dumbbell} title="Программы пока нет" action=<Link to="/checkpoint">Пройти тест и собрать программу</Link>`
  - `session` → `SessionCard plan action={<Button size="lg" className="w-full" onClick={() => setCheckIn(true)}>Начать тренировку</Button>}` + `<CheckInSheet plan open onOpenChange />` + `<Disclaimer />`
  - `done` → `Card` «Сделано ✓» (`DAY_RU`, `fmtDate`, RPE `workout.rpe ?? "—"`, длительность из `started_at`/`finished_at` в минутах); ниже: `next` → «Следующая: {fmtDate(next.date)} · {DAY_RU}»; `!next` → `Button asChild <Link to="/checkpoint">Блок завершён — пройти чекпоинт</Link>`
  - `blockDone` → `EmptyState icon={Flag} title="Блок из 4 недель завершён" text="Повтори тест — по нему соберётся следующий блок" action=<Link to="/checkpoint">Чекпоинт</Link>`
  - `missed` → `SessionCard plan title={`Пропущена: ${DAY_RU[plan.dayType]}`} action={<Button className="w-full" onClick={() => setCheckIn(true)}>Сделать сегодня</Button>}`; под карточкой: `next` → «Или дождись следующей: {fmtDate(next.date)}» + `<CheckInSheet plan />`
  - `rest` → `EmptyState icon={Moon} title="День отдыха" text={next ? `Следующая тренировка: ${fmtDate(next.date)} · ${DAY_RU[next.dayType]}` : undefined}`; при `next` ниже `SessionCard plan={next} title="Следующая"` без action
  Маршрут: `index: true, element: <TodayPage />` из `@/features/today/TodayPage`; удалить `src/app/pages/TodayPage.tsx`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(today): today page`.

- [ ] **Step 8: Сквозная проверка в браузере (телефон 390×844 DPR 3).** Очистить `localStorage` (`forma-db`, `forma-onboarding`, `forma-active-workout`), открыть `/forma/` → `onb` редирект нет — показан `noProfile` → скриншот `_screens/today-empty.png`; пройти онбординг (данные владельца, сегодня — выбрать дату запуска = сегодня); `/forma/` → `session` или `rest` (зависит от дня недели: если сегодня не тренировочный день — в DevTools сдвинуть не получится; проверить состояние `rest` и дальше стартовать через календарь в Task 5 — записать в леджер); скриншоты `today-session.png`, `checkin.png`; «Начать» → `/workout/:id` → `workout.png`; залогировать два сета → `workout-rest.png` (таймер отдыха); «Завершить» → `finish.png`; сохранить → `/forma/` → `today-done.png`; перезагрузить страницу во время тренировки → черновик на месте (Review Focus 1). Десктоп (развёрнутое окно) — `today-desktop.png`. Expected: все состояния читаемы, кнопки в видимой области, нижняя навигация не перекрывает контент на `/`, отсутствует на `/workout/*`. Правки вёрстки — коммиты `fix(today|workout): …`. Удалить `_screens/*.png`.

- [ ] **Step 9: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 5: Календарь — план/факт, стрик, детали дня

**Files:**
- Create: `src/features/calendar/calendar.ts`, `src/features/calendar/calendar.test.ts`, `src/features/calendar/CalendarPage.tsx`, `src/features/calendar/DaySheet.tsx`
- Modify: `src/app/router.tsx` (`calendar` → `@/features/calendar/CalendarPage`)
- Delete: `src/app/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: `isoDate`, `toSessionPlan` (`model.ts`), `finishedByPlanned` (`programService.ts`), `SessionCard`, `CheckInSheet` (Task 4), `DAY_RU`, `fmtDate`, `WEEKDAY_RU` (`format.ts`), `addDays`, `startOfWeek`, `weekday`, `parseISO`, `toISODate`, `todayISO`, `diffDays` (`@/lib/dates`), `Rows`, `useDb`, `PlannedSession`, `Workout`, `bySlug`, `EmptyState`.
- Produces:
```ts
// calendar.ts
export type DayStatus = "done" | "planned" | "missed" | "rest"
export function monthGrid(monthStart: string): string[][]
// недели Пн–Вс, покрывающие месяц monthStart (YYYY-MM-01); первая строка начинается с startOfWeek(monthStart); строки добавляются, пока последняя не содержит последний день месяца
export function daySessions(rows: Rows, date: string): { planned?: PlannedSession; workouts: Workout[] }
// planned — plannedSession на дату (любой программы; если несколько — с наибольшим updated_at); workouts — завершённые (finished_at !== null) с isoDate(started_at) === date, по started_at ↑
export function dayStatus(rows: Rows, date: string, today: string): DayStatus
// done: есть завершённая тренировка, начатая в этот день, ИЛИ плановая сессия этого дня завершена (finishedByPlanned); planned: плановая без завершения и date >= today; missed: то же и date < today; иначе rest
export function weekProgress(rows: Rows, weekStart: string): { done: number; total: number }   // плановые сессии в [weekStart, weekStart+6]: завершённых / всего
export function weekStreak(rows: Rows, today: string): number
// текущая неделя считается, если total > 0 и done === total; дальше назад по неделям, пока total > 0 и done === total; неделя без плановых сессий останавливает счёт
export interface WorkoutSummary { startedAt: string; durationMin: number | null; rpe: number | null; notes: string | null; sets: { slug: string; setNo: number; reps: number | null; durationS: number | null; weightKg: number | null }[] }
export function workoutSummary(rows: Rows, workoutId: string): WorkoutSummary | undefined   // sets по slug в порядке первого появления, внутри по set_no; durationMin = round((finished - started)/60000) или null
```

- [ ] **Step 1: Тест** (`calendar.test.ts`):

```ts
import { finishSession, programRows } from "@/features/program/engine/fixtures/rows"
import { plannedSessions } from "@/features/program/programService"
import { dayStatus, daySessions, monthGrid, weekProgress, weekStreak, workoutSummary } from "./calendar"

it("monthGrid covers a month in Monday-based weeks", () => {
  const g = monthGrid("2026-10-01")   // Thursday start → 5 rows
  expect(g).toHaveLength(5)
  expect(g.every((w) => w.length === 7)).toBe(true)
  expect(g[0][0]).toBe("2026-09-28")
  expect(g[4][6]).toBe("2026-11-01")
  expect(g.flat()).toContain("2026-10-31")
  const feb = monthGrid("2026-02-01")   // Sunday start → 5 rows
  expect(feb[0][0]).toBe("2026-01-26")
  expect(feb[4][6]).toBe("2026-03-01")
  expect(monthGrid("2027-02-01")).toHaveLength(4)   // Monday start, 28 days → exactly 4 rows
})
```

```ts
it("dayStatus: done, planned, missed, rest; a workout counts for the day it started", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  expect(dayStatus(rows, "2026-10-12", "2026-10-12")).toBe("planned")
  expect(dayStatus(rows, "2026-10-12", "2026-10-13")).toBe("missed")
  expect(dayStatus(rows, "2026-10-13", "2026-10-13")).toBe("rest")
  finishSession(rows, s[0].id, new Date(2026, 9, 12, 23, 40).toISOString(), [])   // started before midnight local time
  expect(dayStatus(rows, "2026-10-12", "2026-10-13")).toBe("done")
  expect(daySessions(rows, "2026-10-12").workouts.map((w) => w.id)).toEqual([`w-${s[0].id}`])
  expect(daySessions(rows, "2026-10-12").planned?.id).toBe(s[0].id)
  finishSession(rows, s[1].id, new Date(2026, 9, 15, 9, 0).toISOString(), [])   // Wednesday's session done on Thursday
  expect(dayStatus(rows, "2026-10-14", "2026-10-20")).toBe("done")
  expect(dayStatus(rows, "2026-10-15", "2026-10-20")).toBe("done")
})
it("weekProgress and weekStreak", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  expect(weekProgress(rows, "2026-10-12")).toEqual({ done: 0, total: 3 })
  expect(weekStreak(rows, "2026-10-13")).toBe(0)
  for (const x of s.slice(0, 3)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(weekProgress(rows, "2026-10-12")).toEqual({ done: 3, total: 3 })
  expect(weekStreak(rows, "2026-10-16")).toBe(1)   // current week complete
  expect(weekStreak(rows, "2026-10-20")).toBe(1)   // previous week complete, current not yet
  for (const x of s.slice(3, 6)) finishSession(rows, x.id, `${x.date}T18:00:00.000Z`, [])
  expect(weekStreak(rows, "2026-10-27")).toBe(2)
  expect(weekStreak(rows, "2026-10-11")).toBe(0)   // the week before the program has no sessions
})
it("workoutSummary groups sets by exercise in order", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [{ slug: "push-up", reps: 10 }, { slug: "squat", reps: 15, weightKg: 10 }, { slug: "push-up", reps: 8 }], 7)
  rows.workouts[`w-${s[0].id}`].finished_at = "2026-10-12T18:31:00.000Z"
  const sum = workoutSummary(rows, `w-${s[0].id}`)!
  expect(sum).toMatchObject({ startedAt: "2026-10-12T18:00:00.000Z", durationMin: 31, rpe: 7, notes: null })
  expect(sum.sets).toEqual([
    { slug: "push-up", setNo: 1, reps: 10, durationS: null, weightKg: null },
    { slug: "push-up", setNo: 2, reps: 8, durationS: null, weightKg: null },
    { slug: "squat", setNo: 1, reps: 15, durationS: null, weightKg: 10 },
  ])
  expect(workoutSummary(rows, "nope")).toBeUndefined()
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/calendar` → FAIL. **Step 3:** реализовать по одной функции с коммитом после зелёного своего `it`: `monthGrid` (`feat(calendar): month grid`), `daySessions`+`dayStatus` (`feat(calendar): day status`), `weekProgress`+`weekStreak` (`feat(calendar): week progress and streak`), `workoutSummary` (`feat(calendar): workout summary`). **Step 4: Run** → PASS (4 теста).

- [ ] **Step 5: `DaySheet.tsx`** — `DaySheet({ date, open, onOpenChange }: { date: string | null; open: boolean; onOpenChange: (o: boolean) => void })`: `Drawer`, заголовок `fmtDate(date)`; `const { planned, workouts } = daySessions(rows, date)`; для каждой тренировки — `workoutSummary`: строка «{durationMin} мин · RPE {rpe}», список сетов: имя упражнения (`bySlug`) и `reps`/`durationS с`/`× weightKg кг`; `notes`; затем `planned` без завершения → `SessionCard plan={toSessionPlan(planned)}` с `action` «Начать эту тренировку» (только при `date <= todayISO()`; открывает `CheckInSheet`); будущая → карточка без action; нет ничего → «Отдых». Commit `feat(calendar): day sheet`.

- [ ] **Step 6: `CalendarPage.tsx`** — состояние `month` (YYYY-MM-01, по умолчанию текущий); шапка: «Календарь», кнопки `ChevronLeft`/`ChevronRight`, название месяца (`parseISO(month).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })`); строка статистики: `Flame` «Стрик: {weekStreak(rows, today)} нед.» и «Эта неделя: {done}/{total}» с `Progress`; сетка `grid grid-cols-7`: шапка `WEEKDAY_RU`, ячейки — `button` с числом дня, дни другого месяца `text-muted-foreground/50`, сегодня — `ring-1 ring-primary`, статус — точка под числом: done `bg-primary`, planned `border border-primary`, missed `bg-destructive/50`, rest — пусто; `aria-label={`${fmtDate(d)}: ${STATUS_RU[status]}`}`; тап → `DaySheet`. Легенда под сеткой. Без активной программы и без тренировок → `EmptyState icon={CalendarDays} title="Пока пусто" text="Календарь заполнится после анкеты" action=<Link to="/onboarding">`. Маршрут → `@/features/calendar/CalendarPage`; удалить `src/app/pages/CalendarPage.tsx`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(calendar): calendar page`.

- [ ] **Step 7: Скриншоты (телефон, затем десктоп)** — `/forma/calendar` после сквозного сценария Task 4: `_screens/calendar.png` (точки статусов видны, сегодня подсвечен), тап по завершённому дню → `calendar-day-done.png`, по будущему — `calendar-day-planned.png`, по прошедшему плановому без тренировки (если есть) → «Начать эту тренировку» → старт работает (Review Focus 2: стартовать можно только дату ≤ сегодня). Десктоп — `calendar-desktop.png`. Удалить `_screens/*.png`.

- [ ] **Step 8: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 6: Прогресс — замеры и графики

**Files:**
- Run once: `npx shadcn@latest add chart` (создаёт `src/components/ui/chart.tsx`, ставит `recharts`). Skill `dataviz` из спеки в этой установке отсутствует — ruling в леджер: графики через shadcn chart (recharts), один файл на график.
- Create: `src/features/analytics/stats.ts`, `src/features/analytics/stats.test.ts`, `src/features/analytics/ProgressPage.tsx`, `src/features/analytics/MetricsForm.tsx`, `src/features/analytics/charts/ProgressCharts.tsx` (композиция, lazy-граница), `charts/WeightChart.tsx`, `charts/SetsChart.tsx`, `charts/PlanFactChart.tsx`, `charts/TestChart.tsx`
- Modify: `src/app/router.tsx` (`progress` → `@/features/analytics/ProgressPage`)
- Delete: `src/app/pages/ProgressPage.tsx`

**Interfaces:**
- Consumes: `rollingMean`, `Point`, `navyBodyFat`, `bmi` (`@/lib/calc`), `weekProgress`, `weekStreak` (`calendar.ts`), `isoDate`, `metricId` (`model.ts`), `Muscle`, `Exercise` (`@/content/types`), `BodyMetric`, `Profile`, `TestRow` (`@/lib/schema`), `startOfWeek`, `addDays`, `todayISO` (`@/lib/dates`), `Rows`, `Upsertable`, `useDb`, `bySlug`, `EmptyState`, `Rating` не нужен.
- Produces:
```ts
// stats.ts
export type MuscleGroup = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core" | "calves"
export const MUSCLE_GROUP: Record<Muscle, MuscleGroup>
// chest→chest; "middle back","lower back",lats,traps,neck→back; shoulders→shoulders; biceps,triceps,forearms→arms; quadriceps,hamstrings,adductors,abductors→legs; glutes→glutes; abdominals→core; calves→calves
export const GROUP_RU: Record<MuscleGroup, string> = { chest: "Грудь", back: "Спина", shoulders: "Плечи", arms: "Руки", legs: "Ноги", glutes: "Ягодицы", core: "Кор", calves: "Икры" }
export type MetricKey = "weight_kg" | "waist_cm" | "neck_cm" | "hip_cm"
export function metricSeries(rows: Rows, key: MetricKey): Point[]                        // ненулевые, по дате ↑
export function latestValue(rows: Rows, key: MetricKey): Point | undefined
export function weightTrend(rows: Rows): { raw: Point[]; mean: Point[] }                // mean = rollingMean(raw, 7)
export function weeklySetsByGroup(rows: Rows, exercises: Map<string, Exercise>, weekStart: string): Record<MuscleGroup, number>
// завершённые тренировки с isoDate(started_at) в [weekStart, +6]; каждый workout_set добавляет 1 каждой уникальной группе primaryMuscles своего упражнения; неизвестный slug пропускается
export function planVsFact(rows: Rows, today: string, weeks = 8): { week: string; planned: number; done: number }[]   // недели по startOfWeek, старшая первая, последняя — текущая; из weekProgress
export function testSeries(rows: Rows): { date: string; kind: TestRow["kind"]; pushups: number; squats: number; plank_s: number }[]   // по дате ↑
export function bodyFatNow(rows: Rows, profile: Pick<Profile, "sex" | "height_cm">): number | null
// последний по дате замер с waist_cm и neck_cm (для female — и hip_cm) → navyBodyFat; иначе null
export function mergeMetric(existing: BodyMetric | undefined, patch: Partial<Record<MetricKey, number | null>>, userId: string, date: string): Upsertable<"body_metrics">
// { id: metricId(userId, date), date, weight_kg: patch.weight_kg ?? existing?.weight_kg ?? null, … } — поле из patch со значением null обнуляет
```

- [ ] **Step 1: Установка** `npx shadcn@latest add chart` → появился `src/components/ui/chart.tsx`, в `package.json` — `recharts`. `npm run typecheck && npm run build` → PASS. Commit `chore(ui): add shadcn chart (recharts)`.

- [ ] **Step 2: Тесты** (`stats.test.ts`):

```ts
import { all as exercises, bySlug } from "@/features/exercises/useExercises"
import { finishSession, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { plannedSessions } from "@/features/program/programService"
import { emptyRows } from "@/lib/db"
import { bodyFatNow, GROUP_RU, latestValue, mergeMetric, metricSeries, MUSCLE_GROUP, planVsFact, testSeries, weeklySetsByGroup, weightTrend } from "./stats"

const metric = (id: string, date: string, weight_kg: number | null, waist_cm: number | null = null, neck_cm: number | null = null, hip_cm: number | null = null) =>
  ({ id, user_id: "local", created_at: "", updated_at: "", date, weight_kg, waist_cm, neck_cm, hip_cm })

it("every muscle maps to a labelled group and every exercise's muscles are covered", () => {
  expect(Object.keys(MUSCLE_GROUP)).toHaveLength(17)
  expect(new Set(Object.values(MUSCLE_GROUP))).toEqual(new Set(Object.keys(GROUP_RU)))
  expect(exercises.every((e) => [...e.primaryMuscles, ...e.secondaryMuscles].every((m) => m in MUSCLE_GROUP))).toBe(true)
})
it("metricSeries skips nulls and sorts by date; latestValue; weightTrend has a 7-day mean", () => {
  const rows = emptyRows()
  rows.body_metrics.b = metric("b", "2026-10-14", 81)
  rows.body_metrics.a = metric("a", "2026-10-12", 82)
  rows.body_metrics.c = metric("c", "2026-10-16", null, 90)
  expect(metricSeries(rows, "weight_kg")).toEqual([{ date: "2026-10-12", value: 82 }, { date: "2026-10-14", value: 81 }])
  expect(latestValue(rows, "weight_kg")).toEqual({ date: "2026-10-14", value: 81 })
  expect(latestValue(rows, "waist_cm")).toEqual({ date: "2026-10-16", value: 90 })
  expect(latestValue(rows, "hip_cm")).toBeUndefined()
  expect(weightTrend(rows).mean).toEqual([{ date: "2026-10-12", value: 82 }, { date: "2026-10-14", value: 81.5 }])
})
it("weeklySetsByGroup counts a set once per primary muscle group", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  const push = exercises.find((e) => e.pattern === "push_h")!
  const squat = exercises.find((e) => e.pattern === "squat")!
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [{ slug: push.slug, reps: 10 }, { slug: push.slug, reps: 8 }, { slug: squat.slug, reps: 15 }, { slug: "unknown-slug", reps: 1 }])
  finishSession(rows, s[3].id, "2026-10-19T18:00:00.000Z", [{ slug: push.slug, reps: 10 }])   // next week
  const groups = weeklySetsByGroup(rows, bySlug, "2026-10-12")
  const expected: Record<string, number> = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, glutes: 0, core: 0, calves: 0 }
  for (const g of new Set(push.primaryMuscles.map((m) => MUSCLE_GROUP[m]))) expected[g] += 2
  for (const g of new Set(squat.primaryMuscles.map((m) => MUSCLE_GROUP[m]))) expected[g] += 1
  expect(groups).toEqual(expected)
})
it("planVsFact returns the last weeks ending with the current one", () => {
  const rows = programRows()
  const s = plannedSessions(rows, "p1")
  finishSession(rows, s[0].id, "2026-10-12T18:00:00.000Z", [])
  expect(planVsFact(rows, "2026-10-21", 3)).toEqual([
    { week: "2026-10-05", planned: 0, done: 0 },
    { week: "2026-10-12", planned: 3, done: 1 },
    { week: "2026-10-19", planned: 3, done: 0 },
  ])
})
it("testSeries sorts by date; bodyFatNow needs waist and neck, plus hip for women", () => {
  const rows = emptyRows()
  rows.tests.t2 = { id: "t2", user_id: "local", created_at: "", updated_at: "", date: "2026-11-09", kind: "checkpoint", results: { pushups: 18, squats: 30, plank_s: 60 } }
  rows.tests.t1 = { id: "t1", user_id: "local", created_at: "", updated_at: "", date: "2026-10-12", kind: "baseline", results: { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2, single_leg_calf_raises: 10, balance_eyes_closed_s: 10 } } }
  expect(testSeries(rows)).toEqual([{ date: "2026-10-12", kind: "baseline", pushups: 12, squats: 25, plank_s: 40 }, { date: "2026-11-09", kind: "checkpoint", pushups: 18, squats: 30, plank_s: 60 }])
  expect(bodyFatNow(rows, ownerProfileRow)).toBeNull()
  rows.body_metrics.a = metric("a", "2026-10-12", 82, 90, 40)
  rows.body_metrics.b = metric("b", "2026-10-14", 81)
  expect(bodyFatNow(rows, ownerProfileRow)).toBeCloseTo(navyBodyFat({ sex: "male", heightCm: 180, waistCm: 90, neckCm: 40 })!, 5)
  expect(bodyFatNow(rows, { sex: "female", height_cm: 165 })).toBeNull()
  rows.body_metrics.a.hip_cm = 100
  expect(bodyFatNow(rows, { sex: "female", height_cm: 165 })).not.toBeNull()
})
it("mergeMetric keeps fields missing from the patch and uses the deterministic id", () => {
  const existing = metric("x", "2026-10-12", 82, 90, null)
  expect(mergeMetric(existing, { weight_kg: 81.5, neck_cm: 40 }, "local", "2026-10-12")).toEqual({ id: metricId("local", "2026-10-12"), date: "2026-10-12", weight_kg: 81.5, waist_cm: 90, neck_cm: 40, hip_cm: null })
  expect(mergeMetric(undefined, { weight_kg: 80 }, "local", "2026-10-13")).toEqual({ id: metricId("local", "2026-10-13"), date: "2026-10-13", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
  expect(mergeMetric(existing, { waist_cm: null }, "local", "2026-10-12").waist_cm).toBeNull()
})
```
(добавить импорты `navyBodyFat` из `@/lib/calc` и `metricId` из `@/features/program/model`).

- [ ] **Step 3: Run** `npx vitest run src/features/analytics` → FAIL. **Step 4:** по одной функции, коммит после зелёного своего `it`: `MUSCLE_GROUP`+`GROUP_RU` (`feat(analytics): muscle groups`), `metricSeries`+`latestValue`+`weightTrend` (`feat(analytics): metric series`), `weeklySetsByGroup` (`feat(analytics): weekly sets by group`), `planVsFact` (`feat(analytics): plan vs fact`), `testSeries`+`bodyFatNow` (`feat(analytics): tests and body fat`), `mergeMetric` (`feat(analytics): merge metric`). **Step 5: Run** → PASS (6 тестов).

- [ ] **Step 6: `MetricsForm.tsx`** — `MetricsForm({ open, onOpenChange })`: `Drawer` «Замер»; поля: дата (`Input type="date"`, по умолчанию `todayISO()`, максимум сегодня), вес кг (`step="0.1"`), талия см, шея см, бёдра см (поле бёдер только при `profile.sex === "female"`; подсказка «нужны для % жира»); при открытии подставляет значения существующего замера за выбранную дату; «Сохранить» → `upsert("body_metrics", mergeMetric(rows.body_metrics[metricId(userId, date)], patch, userId, date))` (пустые поля не трогают существующие значения), `toast.success("Замер сохранён")`. Commit `feat(analytics): metrics form`.

- [ ] **Step 7: Графики** (`charts/*.tsx`, каждый ≤120 строк, `ChartContainer` + `ChartConfig` из `@/components/ui/chart`, цвета через `var(--chart-1..5)`):
  - `WeightChart({ raw, mean })` — `LineChart`: точки `raw` (`Scatter` или `Line` с `dot` и без линии, `strokeOpacity 0`), линия `mean` («среднее за 7 дней»); ось X — `fmtDate` без дня недели (`day numeric, month short`).
  - `SetsChart({ data }: { data: { group: string; sets: number }[] })` — горизонтальный `BarChart` по `GROUP_RU`, только группы с `sets > 0`.
  - `PlanFactChart({ data }: { data: { week: string; planned: number; done: number }[] })` — `BarChart` две серии («План», «Факт»), подпись недели — `fmtDate(week)` без weekday.
  - `TestChart({ data })` — `LineChart` три линии: отжимания, приседания, планка (с); ось для планки — правая (`yAxisId="right"`).
  - `ProgressCharts.tsx` — `export default function ProgressCharts({ rows, exercises, today })`: считает серии через `stats.ts` и рендерит четыре карточки с графиками; каждая — `EmptyState`-подобный текст, если данных < 2 точек («Нужно ≥2 замера», «Пока нет тренировок на этой неделе», «Нет тестов»).
  Commit `feat(analytics): charts`.

- [ ] **Step 8: `ProgressPage.tsx`** — заголовок «Прогресс» + кнопка «Добавить замер» (`Plus`) → `MetricsForm`; сетка карточек `grid grid-cols-2 gap-3`: «Вес» (`latestValue(weight)` + «ср. 7 дн.: {mean.at(-1)}»), «ИМТ» (`bmi(weight, profile.height_cm)` при обоих), «% жира» (`bodyFatNow` или «нужны талия и шея»), «Стрик» (`weekStreak(rows, today)` нед.); без веса — `EmptyState icon={Scale} title="Добавь первый замер" text="Вес — раз в неделю утром; талия и шея — для % жира"` и та же кнопка (Review Focus 4: без веса никаких NaN — проверить вручную, что карточки показывают «—»); ниже `Suspense fallback={<Skeleton className="h-64" />}` → `lazy(() => import("./charts/ProgressCharts"))`. Без профиля — `EmptyState` «Сначала анкета» → `/onboarding`. Маршрут → `@/features/analytics/ProgressPage`; удалить `src/app/pages/ProgressPage.tsx`. Run `npm run lint && npm run typecheck && npm run build` → PASS (recharts в отдельном lazy-чанке: убедиться по выводу build, что `index` чанк не вырос на recharts). Commit `feat(analytics): progress page`.

- [ ] **Step 9: Скриншоты** — телефон: `/forma/progress` без замеров → `_screens/progress-empty.png`; добавить 3 замера разными датами через форму → `progress.png` (вес/ИМТ/% жира/стрик + графики); десктоп → `progress-desktop.png`. Удалить `_screens/*.png`.

- [ ] **Step 10: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 7: Чекпоинт — ретест, разблокировка ударной нагрузки, следующий блок

**Files:**
- Create: `src/features/checkpoints/checkpoint.ts`, `src/features/checkpoints/checkpoint.test.ts`, `src/features/checkpoints/CheckpointPage.tsx`, `src/features/checkpoints/AnkleCriteria.tsx`
- Modify: `src/app/router.tsx` (+ `{ path: "checkpoint", element: <CheckpointPage /> }`)

**Interfaces:**
- Consumes: `ANKLE_CRITERIA`, `ankleCleared` (`engine/restrictions.ts`), `TestInput` (`engine/types.ts`), `activeProgram`, `historyFor`, `nextBlock`, `buildProgram`, `plannedSessions`, `finishedByPlanned`, `blockComplete`, `ProgramRows` (`programService.ts`), `newConfig`, `profileInput`, `testId`, `StoredConfig` (`model.ts`), `TestForm`, `TestDraft`, `completeTest` (Task 2), `Disclaimer`, `EmptyState`, `fmtDate`, `DAY_RU` (`format.ts`), `AnkleTest`, `TestRow`, `Profile` (`@/lib/schema`), `Rows`, `Upsertable`, `useDb`, `newId`, `todayISO`, `all as exercises`.
- Produces:
```ts
// checkpoint.ts
export interface Criterion { key: keyof AnkleTest; label: string; value: number | undefined; target: number; op: "≤" | "≥"; ok: boolean }
export function ankleStatus(ankle: Partial<AnkleTest> | undefined): { cleared: boolean; criteria: Criterion[] }
// порядок и подписи: knee_to_wall_diff_cm «Knee-to-wall: разница между ногами, см» ≤ ANKLE_CRITERIA.kneeToWallDiffCm; single_leg_calf_raises «Подъёмы на носок на одной ноге, раз» ≥ singleLegCalfRaises; balance_eyes_closed_s «Баланс с закрытыми глазами, с» ≥ balanceEyesClosedS; value undefined → ok false; cleared = все ok (для полного теста совпадает с ankleCleared)
export const KIND_RU: Record<TestRow["kind"], string> = { baseline: "Базовый", checkpoint: "Чекпоинт" }
export function latestTest(rows: Rows): TestRow | undefined        // максимум по date; при равенстве checkpoint важнее baseline
export function remainingSessions(rows: Rows): number               // незавершённые сессии активной программы (0 без программы)
export function checkpointRows(rows: Rows, results: TestRow["results"], userId: string, today: string, exercises: Exercise[]): { test: Upsertable<"tests">; program: ProgramRows }
// kind = latestTest(rows) ? "checkpoint" : "baseline"; test = { id: testId(userId, today, kind), date: today, kind, results }
// активная программа есть → nextBlock(active, { ...results, date: today }, today, exercises, historyFor(rows))
// нет → buildProgram(newConfig(profileInput(profile), { ...results, date: today }, today, newId()), exercises, historyFor(rows))
// без rows.profiles[userId] → throw new Error("no profile")
```

- [ ] **Step 1: Тест** (`checkpoint.test.ts`):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { clearedAnkle } from "@/features/program/engine/fixtures/owner"
import { finishSession, META, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import { testId, type StoredConfig } from "@/features/program/model"
import { plannedSessions } from "@/features/program/programService"
import { emptyRows, type Rows } from "@/lib/db"
import type { TestRow } from "@/lib/schema"
import { ankleStatus, checkpointRows, latestTest, remainingSessions } from "./checkpoint"

const baseResults = { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } }
const testRow = (id: string, date: string, kind: TestRow["kind"]): TestRow => ({ id, ...META, date, kind, results: baseResults })

it("ankleStatus lists the three criteria in order and clears only when all pass", () => {
  const none = ankleStatus(undefined)
  expect(none.cleared).toBe(false)
  expect(none.criteria.map((c) => c.key)).toEqual(["knee_to_wall_diff_cm", "single_leg_calf_raises", "balance_eyes_closed_s"])
  expect(none.criteria.map((c) => `${c.op}${c.target}`)).toEqual(["≤1", "≥25", "≥30"])
  expect(none.criteria.every((c) => !c.ok && c.value === undefined)).toBe(true)
  const partial = ankleStatus({ knee_to_wall_diff_cm: 1, single_leg_calf_raises: 25, balance_eyes_closed_s: 29 })
  expect(partial.criteria.map((c) => c.ok)).toEqual([true, true, false])
  expect(partial.cleared).toBe(false)
  expect(ankleStatus(clearedAnkle).cleared).toBe(true)
})
it("latestTest picks the newest date, checkpoint over baseline on a tie", () => {
  const rows = emptyRows()
  expect(latestTest(rows)).toBeUndefined()
  rows.tests.a = testRow("a", "2026-10-12", "baseline")
  rows.tests.b = testRow("b", "2026-11-09", "checkpoint")
  rows.tests.c = testRow("c", "2026-11-09", "baseline")
  expect(latestTest(rows)?.id).toBe("b")
  delete rows.tests.b
  expect(latestTest(rows)?.id).toBe("c")
})
it("checkpointRows writes a checkpoint test and the next block of the active program", () => {
  const rows = programRows()
  rows.tests.t0 = testRow("t0", "2026-10-12", "baseline")
  const sessions = plannedSessions(rows, "p1")
  for (const s of sessions.slice(0, 11)) finishSession(rows, s.id, `${s.date}T18:00:00.000Z`, [])
  expect(remainingSessions(rows)).toBe(1)
  const results = { pushups: 18, squats: 32, plank_s: 60, ankle: clearedAnkle }
  const out = checkpointRows(rows, results, "local", "2026-11-09", exercises)
  expect(out.test).toEqual({ id: testId("local", "2026-11-09", "checkpoint"), date: "2026-11-09", kind: "checkpoint", results })
  expect(out.program.program).toMatchObject({ id: "p1", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 1, blockStart: "2026-11-09", latestTest: { ...results, date: "2026-11-09" } })
  expect(out.program.sessions[0].date).toBe("2026-11-09")
  rows.tests[out.test.id] = { ...out.test, ...META } as Rows["tests"][string]
  rows.programs.p1 = { ...out.program.program, ...META } as Rows["programs"][string]
  for (const s of out.program.sessions) rows.planned_sessions[s.id] = { ...s, ...META } as Rows["planned_sessions"][string]
  expect(plannedSessions(rows, "p1").every((s) => s.date >= "2026-11-09")).toBe(true)
  expect(latestTest(rows)?.kind).toBe("checkpoint")
  expect(remainingSessions(rows)).toBe(12)
})
it("checkpointRows without an active program builds block 0 from the profile; without a profile it throws", () => {
  const rows = emptyRows()
  rows.profiles.local = ownerProfileRow
  expect(remainingSessions(rows)).toBe(0)
  const out = checkpointRows(rows, baseResults, "local", "2026-10-12", exercises)
  expect(out.test.kind).toBe("baseline")
  expect(out.program.program).toMatchObject({ start_date: "2026-10-12", goal: "fat", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 0, blockStart: "2026-10-12", profile: { goal: "fat", days_per_week: 3 } })
  expect(out.program.sessions).toHaveLength(12)
  expect(out.program.sessions.every((s) => (s.exercises as { block: string }[]).every((e) => e.block !== "finisher"))).toBe(true)
  expect(() => checkpointRows(emptyRows(), baseResults, "local", "2026-10-12", exercises)).toThrow("no profile")
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/checkpoints/checkpoint.test.ts` → FAIL. **Step 3:** по одной функции, коммит после зелёного своего `it`: `ankleStatus`+`KIND_RU` (`feat(checkpoints): ankle criteria status`), `latestTest`+`remainingSessions` (`feat(checkpoints): latest test and remaining sessions`), `checkpointRows` (`feat(checkpoints): checkpoint rows`). **Step 4: Run** → PASS (4 теста).

- [ ] **Step 5: `AnkleCriteria.tsx`** — `AnkleCriteria({ ankle }: { ankle: Partial<AnkleTest> | undefined })`: `Card` «Разблокировка прыжков и скакалки»; список из `ankleStatus(ankle).criteria`: иконка `CircleCheck` (`text-primary`) / `Circle` (`text-muted-foreground`), подпись, справа `{value ?? "—"} / {op}{target}`; подвал: cleared → «Все критерии пройдены — ударная нагрузка разрешена» (`text-primary`), иначе «Пока без прыжков: программа соберётся без ударной нагрузки». Commit `feat(checkpoints): ankle criteria card`.

- [ ] **Step 6: `CheckpointPage.tsx`** — `rows`, `userId`, `profile = rows.profiles[userId]`; нет профиля → `EmptyState icon={ClipboardList} title="Сначала анкета" action=<Link to="/onboarding">Заполнить</Link>`. Иначе: `h1` «Чекпоинт», текст «Повтори тест — по результатам соберётся следующий 4-недельный блок»; `prev = latestTest(rows)` → `Card` «Прошлый тест · {KIND_RU[prev.kind]} · {fmtDate(prev.date)}»: «Отжимания {pushups} · Приседания {squats} · Планка {plank_s} с», при `prev.results.ankle` вторая строка с тремя значениями; `remaining = remainingSessions(rows)`; `active && remaining > 0 && !blockComplete(rows, today)` → предупреждение (`Card className="border-destructive/50"`): «Текущий блок не закончен: осталось {remaining}. Новый блок начнётся сегодня и заменит оставшиеся тренировки»; `const [draft, setDraft] = useState<TestDraft>({})`; `withAnkle = profile.injuries.includes("ankle")`; `<TestForm value={draft} onChange={setDraft} withAnkle />`; при `withAnkle` → `<AnkleCriteria ankle={draft} />` (живой пересчёт); `results = completeTest(draft, withAnkle)`; `Button size="lg" className="w-full" disabled={!results}` текст `active ? "Собрать следующий блок" : "Собрать программу"` → `const out = checkpointRows(rows, results, userId, today, exercises)`; `upsert("tests", out.test)`, `upsert("programs", out.program.program)`, `out.program.sessions.forEach(s => upsert("planned_sessions", s))`; `toast.success(\`Блок готов: ${out.program.sessions.length} тренировок, первая ${fmtDate(out.program.sessions[0].date)}\`)`; `navigate("/", { replace: true })`. Маршрут `checkpoint`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(checkpoints): checkpoint page and route`.

- [ ] **Step 7: Скриншоты (телефон).** После сквозного сценария Task 4: `/forma/checkpoint` → `_screens/checkpoint.png` (прошлый тест, форма, критерии с «—»); ввести 18/32/60 и голеностоп 0.5/26/30 → критерии зелёные → `checkpoint-cleared.png`; «Собрать следующий блок» → `/forma/` показывает новый блок (`today-next-block.png`); `/forma/calendar` → сессии со следующей недели, старые будущие заменены; в DevTools `JSON.parse(localStorage["forma-db"]).state.rows.programs` → один program, `config.blockIndex === 1`; в новом блоке есть `finisher` с `impact` упражнением (ударная нагрузка разблокирована — Review Focus 3). Десктоп — `checkpoint-desktop.png`. Удалить `_screens/*.png`.

- [ ] **Step 8: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 8: Контент питания — каталог продуктов РБ и шаблоны меню

**Files:**
- Create: `src/content/foods.json`, `src/content/menus.json`, `src/content/foods.test.ts`, `src/features/nutrition/foods.ts`

**Interfaces:**
- Consumes: `zod` (dev, только в тесте).
- Produces:
```ts
// foods.ts
export type FoodCategory = "dairy" | "eggs" | "meat" | "fish" | "grain" | "bread" | "legume" | "vegetable" | "fruit" | "fat" | "other"
export const CATEGORY_ORDER: FoodCategory[] = ["dairy", "eggs", "meat", "fish", "grain", "bread", "legume", "vegetable", "fruit", "fat", "other"]
export const CATEGORY_RU: Record<FoodCategory, string> = { dairy: "Молочное", eggs: "Яйца", meat: "Мясо и птица", fish: "Рыба и морепродукты", grain: "Крупы и макароны", bread: "Хлеб", legume: "Бобовые", vegetable: "Овощи и зелень", fruit: "Фрукты и ягоды", fat: "Масла, орехи, семена", other: "Прочее" }
export interface Macros { kcal: number; protein: number; fat: number; carbs: number }
export interface Food { id: string; name: string; category: FoodCategory; countries: string[]; per100: Macros; unit?: { name: string; grams: number } }
export type MenuGoal = "deficit" | "maintenance" | "surplus"
export type MenuItem = [foodId: string, grams: number]
export interface Meal { name: string; items: MenuItem[] }
export interface MenuDay { meals: Meal[] }
export interface Menu { id: MenuGoal; title: string; baseKcal: number; days: MenuDay[] }   // ровно 7 дней, Пн..Вс
export const foods: Food[]                      // foods.json
export const foodById: Map<string, Food>
export const menus: Menu[]                      // menus.json
export const menuById: Record<MenuGoal, Menu>
export const foodsFor = (country: string): Food[] => foods.filter((f) => f.countries.includes(country))
```

Данные: макросы на 100 г сырого продукта (как продаётся) из USDA FoodData Central / таблиц Скурихина; `countries: ["BY"]` у всех позиций v1. `unit` — для штучных продуктов (яйцо «шт» 55 г, яблоко «шт» 150, банан «шт» 120, хлеб «ломтик» 35, хлебцы «шт» 10, мандарин «шт» 70, киви «шт» 75, груша «шт» 160, картофель «шт» 120, огурец «шт» 120, томат «шт» 120, перец «шт» 150, лук «шт» 80).

Инвентарь (id — название), 125 позиций:
- dairy (15): tvorog-0 — Творог 0%; tvorog-5 — Творог 5%; tvorog-9 — Творог 9%; kefir-1 — Кефир 1%; kefir-3 — Кефир 3,2%; milk-1 — Молоко 1,5%; milk-2 — Молоко 2,5%; yogurt-natural — Йогурт натуральный 2,5%; ryazhenka — Ряженка 2,5%; smetana-15 — Сметана 15%; cheese-hard — Сыр твёрдый 45%; cheese-mozzarella — Моцарелла; cheese-brynza — Брынза; cheese-processed — Сыр плавленый; butter — Масло сливочное 82,5%
- eggs (2): egg — Яйцо куриное; egg-quail — Яйцо перепелиное
- meat (17): chicken-breast — Куриное филе; chicken-thigh — Куриное бедро без кожи; chicken-drumstick — Куриная голень; turkey-breast — Филе индейки; turkey-thigh — Бедро индейки; beef-lean — Говядина постная; ground-beef — Фарш говяжий; ground-chicken — Фарш куриный; pork-loin — Свинина карбонад; pork-neck — Свинина шея; beef-liver — Печень говяжья; chicken-liver — Печень куриная; chicken-hearts — Сердечки куриные; rabbit — Кролик; ham — Ветчина; sausage-boiled — Колбаса варёная; sosiski — Сосиски
- fish (11): pollock — Минтай; hake — Хек; cod — Треска; herring-salted — Сельдь солёная; mackerel — Скумбрия; pink-salmon — Горбуша; trout — Форель; saury-canned — Сайра консервированная; tuna-canned — Тунец в собственном соку; shrimp — Креветки; squid — Кальмар
- grain (13): buckwheat — Гречка ядрица; oats — Овсяные хлопья; rice-white — Рис белый; rice-brown — Рис бурый; millet — Пшено; barley-pearl — Перловка; barley-groats — Ячневая крупа; bulgur — Булгур; pasta-durum — Макароны из твёрдых сортов; semolina — Манка; corn-grits — Кукурузная крупа; oat-bran — Отруби овсяные; muesli — Мюсли без сахара
- bread (5): bread-rye — Хлеб ржаной; bread-white — Батон пшеничный; bread-wholegrain — Хлеб цельнозерновой; crispbread-rye — Хлебцы ржаные; lavash — Лаваш тонкий
- legume (6): beans-canned — Фасоль консервированная; beans-dry — Фасоль сухая; peas-dry — Горох сухой; peas-green-canned — Горошек зелёный консервированный; lentils — Чечевица; chickpeas — Нут
- vegetable (21): potato — Картофель; beet — Свёкла; carrot — Морковь; cabbage — Капуста белокочанная; sauerkraut — Капуста квашеная; cauliflower — Капуста цветная; broccoli — Брокколи; onion — Лук репчатый; garlic — Чеснок; cucumber — Огурец; tomato — Томат; bell-pepper — Перец сладкий; zucchini — Кабачок; pumpkin — Тыква; radish — Редис; herbs — Зелень (укроп, петрушка); lettuce — Салат листовой; mushrooms — Шампиньоны; corn-canned — Кукуруза консервированная; green-beans — Фасоль стручковая (замороженная); spinach — Шпинат
- fruit (18): apple — Яблоко; pear — Груша; banana — Банан; orange — Апельсин; mandarin — Мандарин; kiwi — Киви; grapes — Виноград; plum — Слива; strawberry — Клубника; blueberry — Черника; cranberry — Клюква; blackcurrant — Смородина чёрная; raspberry — Малина; watermelon — Арбуз; lemon — Лимон; raisins — Изюм; dried-apricots — Курага; prunes — Чернослив
- fat (9): oil-sunflower — Масло подсолнечное; oil-olive — Масло оливковое; oil-flax — Масло льняное; walnuts — Грецкий орех; peanuts — Арахис; almonds — Миндаль; sunflower-seeds — Семечки подсолнечника; flax-seeds — Семена льна; peanut-butter — Арахисовая паста
- other (8): honey — Мёд; sugar — Сахар; cocoa — Какао-порошок; chocolate-dark — Шоколад горький 70%; whey-protein — Протеин сывороточный; tomato-paste — Томатная паста; soy-sauce — Соевый соус; jam — Варенье

Меню (`menus.json`): три шаблона — `deficit` «Дефицит» `baseKcal` 1800, `maintenance` «Поддержка» 2200, `surplus` «Профицит» 2600; у каждого 7 дней по 4 приёма: «Завтрак», «Обед», «Перекус», «Ужин». Правила составления каждого дня: источник белка в каждом приёме (мясо/рыба/яйца/творог/протеин), творог или кефир/йогурт ежедневно, крупа на завтрак и обед, ≥400 г овощей + фруктов, рыба минимум 2 дня в неделю, масло/орехи ежедневно; `deficit` — постные источники (tvorog-5, chicken-breast, pollock, kefir-1, овощи); `surplus` — больше круп, хлеб, банан, орехи, арахисовая паста, масло; `maintenance` — между ними; все 7 дней шаблона различаются. Эталонный день `deficit` (≈1860 ккал, Б 154 г):

```json
{ "meals": [
  { "name": "Завтрак", "items": [["oats", 60], ["milk-1", 200], ["egg", 110], ["apple", 150]] },
  { "name": "Обед", "items": [["buckwheat", 70], ["chicken-breast", 150], ["cabbage", 150], ["carrot", 50], ["oil-sunflower", 7]] },
  { "name": "Перекус", "items": [["tvorog-5", 200], ["blueberry", 50]] },
  { "name": "Ужин", "items": [["pollock", 200], ["potato", 200], ["cucumber", 100], ["tomato", 100], ["oil-olive", 7], ["kefir-1", 250]] }
] }
```

- [ ] **Step 1: Тест** (`src/content/foods.test.ts`):

```ts
import { z } from "zod"
import foods from "./foods.json"
import menus from "./menus.json"

const CATEGORIES = ["dairy", "eggs", "meat", "fish", "grain", "bread", "legume", "vegetable", "fruit", "fat", "other"] as const
const Food = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), name: z.string().min(2), category: z.enum(CATEGORIES), countries: z.array(z.string().length(2)).min(1),
  per100: z.strictObject({ kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100), fat: z.number().min(0).max(100), carbs: z.number().min(0).max(100) }),
  unit: z.strictObject({ name: z.string().min(1), grams: z.number().positive() }).optional(),
})
const Menu = z.strictObject({
  id: z.enum(["deficit", "maintenance", "surplus"]), title: z.string().min(2), baseKcal: z.number().int().min(1200).max(4000),
  days: z.array(z.strictObject({ meals: z.array(z.strictObject({ name: z.string().min(2), items: z.array(z.tuple([z.string(), z.number().min(5).max(600)])).min(1) })).min(3).max(5) })).length(7),
})
const F = z.array(Food).min(100).parse(foods)
const M = z.array(Menu).length(3).parse(menus)
const byId = new Map(F.map((f) => [f.id, f]))
const kcalOf = (items: [string, number][]) => items.reduce((a, [id, g]) => a + (byId.get(id)!.per100.kcal * g) / 100, 0)
const proteinOf = (items: [string, number][]) => items.reduce((a, [id, g]) => a + (byId.get(id)!.per100.protein * g) / 100, 0)

it("foods: unique ids and names, every item available in BY, macros consistent with kcal (Atwater)", () => {
  expect(new Set(F.map((f) => f.id)).size).toBe(F.length)
  expect(new Set(F.map((f) => f.name)).size).toBe(F.length)
  expect(F.every((f) => f.countries.includes("BY"))).toBe(true)
  const off = F.filter((f) => Math.abs(f.per100.kcal - (4 * f.per100.protein + 9 * f.per100.fat + 4 * f.per100.carbs)) > Math.max(25, 0.15 * f.per100.kcal))
  expect(off.map((f) => f.id)).toEqual([])
  const count = (c: string) => F.filter((f) => f.category === c).length
  expect(count("dairy")).toBeGreaterThanOrEqual(8)
  expect(count("meat")).toBeGreaterThanOrEqual(8)
  expect(count("fish")).toBeGreaterThanOrEqual(6)
  expect(count("vegetable")).toBeGreaterThanOrEqual(12)
  expect(count("fruit")).toBeGreaterThanOrEqual(8)
  expect(count("grain")).toBeGreaterThanOrEqual(8)
})
it("menus: three goals, items reference known foods, days differ, totals near baseKcal with 22–40 % protein", () => {
  expect(M.map((m) => [m.id, m.baseKcal])).toEqual([["deficit", 1800], ["maintenance", 2200], ["surplus", 2600]])
  for (const m of M) {
    const missing = m.days.flatMap((d) => d.meals.flatMap((meal) => meal.items.map(([id]) => id))).filter((id) => !byId.has(id))
    expect(missing).toEqual([])
    expect(new Set(m.days.map((d) => JSON.stringify(d))).size).toBe(7)
    for (const [i, d] of m.days.entries()) {
      const items = d.meals.flatMap((meal) => meal.items)
      const kcal = kcalOf(items)
      const share = (proteinOf(items) * 4) / kcal
      expect(Math.abs(kcal - m.baseKcal) / m.baseKcal, `${m.id} day ${i + 1} kcal ${kcal.toFixed(0)}`).toBeLessThanOrEqual(0.12)
      expect(share, `${m.id} day ${i + 1} protein share ${share.toFixed(2)}`).toBeGreaterThanOrEqual(0.22)
      expect(share).toBeLessThanOrEqual(0.4)
    }
  }
})
```

- [ ] **Step 2: Run** `npx vitest run src/content/foods.test.ts` → FAIL (`Cannot find module './foods.json'`). **Step 3:** написать `foods.json` по инвентарю (по категориям, скелет из первых 20 позиций → commit `feat(content): foods catalog skeleton`, затем остальные категории → commit `feat(content): foods catalog (BY)`); `menus.json` — сначала `deficit` с эталонным днём и ещё шестью (commit `feat(content): deficit menu`), затем `maintenance`, `surplus` (commit `feat(content): maintenance and surplus menus`); на каждом шаге прогонять тест — сообщения `off`/`missing`/`kcal`/`share` называют конкретную позицию или день. **Step 4: Run** → PASS (2 теста).

- [ ] **Step 5: `foods.ts`** (типы + загрузчики как в Produces; `menuById = Object.fromEntries(menus.map((m) => [m.id, m])) as Record<MenuGoal, Menu>`). Run `npm run typecheck` → PASS (JSON импортируется через `resolveJsonModule`, как `exercises.json` в `useExercises.ts`). Commit `feat(nutrition): food and menu loaders`.

- [ ] **Step 6: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 9: Питание — цель КБЖУ, недельное меню, список покупок

**Files:**
- Create: `src/features/nutrition/nutrition.ts`, `src/features/nutrition/nutrition.test.ts`, `src/features/nutrition/NutritionPage.tsx`, `src/features/nutrition/MenuDayView.tsx`, `src/features/nutrition/ShoppingSheet.tsx`
- Modify: `src/app/router.tsx` (`nutrition` → `@/features/nutrition/NutritionPage`)
- Delete: `src/app/pages/NutritionPage.tsx`

**Interfaces:**
- Consumes: `bmr`, `tdee`, `targets`, `Targets` (`@/lib/calc`), `Food`, `Macros`, `Menu`, `MenuDay`, `MenuGoal`, `MenuItem`, `foodById`, `menuById`, `CATEGORY_ORDER`, `CATEGORY_RU` (Task 8 `foods.ts`), `latestValue` (Task 6 `stats.ts`), `targetId` (`model.ts`), `GOAL_RU` (`labels.ts`), `WEEKDAY_RU` (`format.ts`), `weekday`, `todayISO`, `parseISO` (`@/lib/dates`), `Rows`, `Upsertable`, `useDb`, `Profile`, `Goal`, `NutritionTarget` (`@/lib/schema`), `EmptyState`, `Disclaimer`.
- Produces:
```ts
// nutrition.ts
export type NutritionProfile = Pick<Profile, "sex" | "birth_year" | "height_cm" | "activity_level" | "goal" | "days_per_week">
export function nutritionFor(p: NutritionProfile, weightKg: number | undefined, today: string): Targets | null
// age = parseISO(today).getFullYear() − birth_year; targets({ tdee: tdee(bmr({ sex, weightKg, heightCm: height_cm, age }), activity_level, days_per_week), goal, weightKg }); null без веса
export const MENU_FOR: Record<Goal, MenuGoal> = { fat: "deficit", muscle: "surplus", tone: "maintenance" }
export const GOAL_NOTE_RU: Record<Goal, string> = { fat: "дефицит −18 %", muscle: "профицит +8 %", tone: "поддержка" }
export const menuFor = (goal: Goal): Menu => menuById[MENU_FOR[goal]]
export function scaleMenu(menu: Menu, kcal: number): Menu     // factor = clamp(kcal / baseKcal, 0.6, 1.6); grams → max(5, round(g·factor / 5)·5); baseKcal → kcal
export function totals(items: MenuItem[], foods: Map<string, Food>): Macros   // сумма per100·g/100, округление до целых; неизвестный id пропускается
export const dayTotals = (day: MenuDay, foods: Map<string, Food>): Macros => totals(day.meals.flatMap((m) => m.items), foods)
export interface ShoppingLine { food: Food; grams: number; units?: number }   // units = ceil(grams / unit.grams) при unit
export function shoppingList(menu: Menu, foods: Map<string, Food>): ShoppingLine[]   // сумма за 7 дней по продукту; порядок CATEGORY_ORDER, внутри — по name (ru)
export function targetRow(userId: string, today: string, t: Targets): Upsertable<"nutrition_targets">   // { id: targetId(userId, today), date_from: today, ...t }
export function latestTarget(rows: Rows): NutritionTarget | undefined   // максимум по date_from
export function needsNewTarget(rows: Rows, t: Targets): boolean         // нет latestTarget или отличается хоть одно из kcal/protein_g/fat_g/carbs_g
```

- [ ] **Step 1: Тест** (`nutrition.test.ts`):

```ts
import { META, ownerProfileRow } from "@/features/program/engine/fixtures/rows"
import { targetId } from "@/features/program/model"
import { bmr, tdee, targets } from "@/lib/calc"
import { emptyRows, type Rows } from "@/lib/db"
import { CATEGORY_ORDER, foodById, menuById } from "./foods"
import { dayTotals, latestTarget, menuFor, needsNewTarget, nutritionFor, scaleMenu, shoppingList, targetRow, totals } from "./nutrition"

const round5 = (g: number, f: number) => Math.max(5, Math.round((g * f) / 5) * 5)

it("nutritionFor: age from today, activity and training days; null without weight", () => {
  expect(nutritionFor(ownerProfileRow, undefined, "2026-10-12")).toBeNull()
  const expected = targets({ tdee: tdee(bmr({ sex: "male", weightKg: 82, heightCm: 180, age: 36 }), "light", 3), goal: "fat", weightKg: 82 })
  expect(nutritionFor(ownerProfileRow, 82, "2026-10-12")).toEqual(expected)
  expect(expected.kcal).toBeGreaterThan(1500)
  expect(expected.kcal).toBeLessThan(2500)
})
it("menuFor maps goals; scaleMenu scales grams within [0.6, 1.6] rounding to 5 g", () => {
  expect([menuFor("fat").id, menuFor("muscle").id, menuFor("tone").id]).toEqual(["deficit", "surplus", "maintenance"])
  const m = menuById.deficit
  const [id, g] = m.days[0].meals[0].items[0]
  const scaled = scaleMenu(m, 1980)
  expect(scaled.baseKcal).toBe(1980)
  expect(scaled.days[0].meals[0].items[0]).toEqual([id, round5(g, 1.1)])
  expect(scaleMenu(m, 500).days[0].meals[0].items[0][1]).toBe(round5(g, 0.6))
  expect(scaleMenu(m, 9000).days[0].meals[0].items[0][1]).toBe(round5(g, 1.6))
  expect(Math.abs(dayTotals(scaled.days[0], foodById).kcal - 1980) / 1980).toBeLessThan(0.15)
  expect(m.days[0].meals[0].items[0][1]).toBe(g)   // source menu untouched
})
it("totals rounds and skips unknown ids; dayTotals sums the meals", () => {
  const e = foodById.get("egg")!.per100
  expect(totals([["egg", 110], ["nope", 100]], foodById)).toEqual({ kcal: Math.round(e.kcal * 1.1), protein: Math.round(e.protein * 1.1), fat: Math.round(e.fat * 1.1), carbs: Math.round(e.carbs * 1.1) })
  expect(totals([], foodById)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 })
  const day = menuById.deficit.days[0]
  expect(dayTotals(day, foodById).kcal).toBe(day.meals.reduce((a, meal) => a + totals(meal.items, foodById).kcal, 0))
})
it("shoppingList sums the week per food in category order and adds units", () => {
  const menu = menuById.deficit
  const list = shoppingList(menu, foodById)
  const weekItems = menu.days.flatMap((d) => d.meals.flatMap((m) => m.items))
  const eggGrams = weekItems.filter(([id]) => id === "egg").reduce((a, [, g]) => a + g, 0)
  expect(eggGrams).toBeGreaterThan(0)
  const egg = list.find((x) => x.food.id === "egg")!
  expect(egg.grams).toBe(eggGrams)
  expect(egg.units).toBe(Math.ceil(eggGrams / foodById.get("egg")!.unit!.grams))
  expect(list.find((x) => x.food.id === "oil-olive")?.units).toBeUndefined()
  expect(new Set(list.map((x) => x.food.id)).size).toBe(list.length)
  expect(new Set(list.map((x) => x.food.id))).toEqual(new Set(weekItems.map(([id]) => id)))
  const order = list.map((x) => CATEGORY_ORDER.indexOf(x.food.category))
  expect(order).toEqual([...order].sort((a, b) => a - b))
})
it("targetRow uses the deterministic id; needsNewTarget compares with the latest target", () => {
  const rows: Rows = emptyRows()
  const t = { kcal: 2000, protein_g: 160, fat_g: 70, carbs_g: 180 }
  expect(latestTarget(rows)).toBeUndefined()
  expect(needsNewTarget(rows, t)).toBe(true)
  const row = targetRow("local", "2026-10-12", t)
  expect(row).toEqual({ id: targetId("local", "2026-10-12"), date_from: "2026-10-12", ...t })
  rows.nutrition_targets[row.id] = { ...row, ...META }
  const older = targetRow("local", "2026-10-01", { ...t, kcal: 1900 })
  rows.nutrition_targets[older.id] = { ...older, ...META }
  expect(latestTarget(rows)?.kcal).toBe(2000)
  expect(needsNewTarget(rows, t)).toBe(false)
  expect(needsNewTarget(rows, { ...t, carbs_g: 181 })).toBe(true)
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/nutrition/nutrition.test.ts` → FAIL. **Step 3:** по одной функции, коммит после зелёного своего `it`: `nutritionFor` (`feat(nutrition): targets from profile`), `MENU_FOR`+`GOAL_NOTE_RU`+`menuFor`+`scaleMenu` (`feat(nutrition): menu scaling`), `totals`+`dayTotals` (`feat(nutrition): macro totals`), `shoppingList` (`feat(nutrition): shopping list`), `targetRow`+`latestTarget`+`needsNewTarget` (`feat(nutrition): target rows`). **Step 4: Run** → PASS (5 тестов).

- [ ] **Step 5: `MenuDayView.tsx`** — `MenuDayView({ day, target }: { day: MenuDay; target: Targets })`: по приёму — `Card` с заголовком `meal.name` и `totals(meal.items).kcal` ккал справа; строки «{food.name} — {grams} г» (+ `· {units} {unit.name}` при `unit`; `units = Math.round(grams / unit.grams)`, минимум 1); внизу строка итогов дня `dayTotals`: «{kcal} ккал · Б {protein} · Ж {fat} · У {carbs}» и цель рядом серым «цель {target.kcal} · {protein_g} / {fat_g} / {carbs_g}». Commit `feat(nutrition): menu day view`.

- [ ] **Step 6: `ShoppingSheet.tsx`** — `ShoppingSheet({ menu, open, onOpenChange })`: `Drawer` «Список покупок на неделю»; `shoppingList(menu, foodById)` сгруппирован по `CATEGORY_RU` (`CATEGORY_ORDER`); строка «{name} — {grams ≥ 1000 ? `${(grams/1000).toFixed(1)} кг` : `${grams} г`}{units ? ` (${units} ${unit.name})` : ""}»; кнопка `Copy` «Скопировать» → `navigator.clipboard.writeText(текст: заголовок категории, строки через \n)` → `toast.success("Скопировано")`, ошибка → `toast.error("Не удалось скопировать")`. Commit `feat(nutrition): shopping sheet`.

- [ ] **Step 7: `NutritionPage.tsx`** — `rows`, `userId`, `profile`; нет профиля → `EmptyState icon={ClipboardList} title="Сначала анкета" action=<Link to="/onboarding">`; `weight = latestValue(rows, "weight_kg")`; `t = useMemo(() => nutritionFor(profile, weight?.value, today))`; без `t` → `EmptyState icon={Scale} title="Нужен вес" text="Добавь замер веса — от него считаются калории и белок" action=<Button asChild><Link to="/progress">К замерам</Link></Button>`; с `t`: `useEffect(() => { if (needsNewTarget(rows, t)) upsert("nutrition_targets", targetRow(userId, today, t)) }, [rows, t, upsert, userId, today])` (после записи `needsNewTarget` → false, цикла нет); `Card` «Цель на день»: `t.kcal` крупно + «ккал», `Badge` ×3 «Б {protein_g} г» «Ж {fat_g} г» «У {carbs_g} г», подпись «{GOAL_RU[goal]} · {GOAL_NOTE_RU[goal]} · вес {weight.value} кг от {fmtDate(weight.date)}»; `menu = useMemo(() => scaleMenu(menuFor(profile.goal), t.kcal))`; заголовок «Меню на неделю» + `Button variant="outline" size="sm"` «Список покупок» (`ShoppingCart`) → `ShoppingSheet`; `Tabs defaultValue={String(weekday(today))}` с `TabsTrigger` по `WEEKDAY_RU` (7 штук, `grid-cols-7`), `TabsContent` → `<MenuDayView day={menu.days[i]} target={t} />`; текст под меню: «Шаблон из продуктов, доступных в Беларуси. Замены внутри категории (минтай → хек, гречка → перловка) цель не меняют»; `<Disclaimer />`. Маршрут → `@/features/nutrition/NutritionPage`; удалить `src/app/pages/NutritionPage.tsx`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(nutrition): nutrition page`.

- [ ] **Step 8: Скриншоты (телефон).** Без замера веса → `_screens/nutrition-noweight.png`; после замера на `/forma/progress` → `/forma/nutrition` → `nutrition.png` (цель + вкладка сегодняшнего дня), «Список покупок» → `shopping.png`; в DevTools `rows.nutrition_targets` — одна строка на сегодня, повторное открытие страницы строк не добавляет (Review Focus 5). Десктоп — `nutrition-desktop.png`. Удалить `_screens/*.png`.

- [ ] **Step 9: Run** `npm test` → PASS (все). Commit остатка.

---
### Task 10: Профиль, пересборка программы, экспорт, тема — и финальная проверка v1

**Files:**
- Create: `src/features/profile/profile.ts`, `src/features/profile/profile.test.ts`, `src/features/profile/ProfilePage.tsx`, `src/features/profile/ProfileForm.tsx`, `src/features/profile/SyncStatus.tsx` (перенос `SyncStatus` из `src/app/pages/ProfilePage.tsx` + строка `lastSyncError`)
- Modify: `src/app/router.tsx` (`profile` → `@/features/profile/ProfilePage`), `src/app/AppLayout.tsx` (точка на иконке профиля при `pending.length > 0 || lastSyncError`)
- Delete: `src/app/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `newConfig`, `profileInput`, `storedConfig`, `StoredConfig` (`model.ts`), `buildProgram`, `activeProgram`, `historyFor`, `ProgramRows` (`programService.ts`), `latestTest`, `KIND_RU` (Task 7), `GOAL_RU`, `EXPERIENCE_RU`, `ACTIVITY_RU`, `INJURY_RU`, `EQUIPMENT_RU` (`labels.ts`), `ChoiceGroup`, `MultiChoice`, `EmptyState`, `Disclaimer`, `useTheme` (`@/components/theme-provider`), `useSession`, `syncEnabled`, `TABLES`, `Profile`, `Program`, `TestRow` (`@/lib/schema`), `Rows`, `Upsertable`, `useDb`, `newId`, `todayISO`, `fmtDate`, `trainingDays` (`format.ts`), `all as exercises`.
- Produces:
```ts
// profile.ts
export const PROGRAM_FIELDS = ["goal", "experience", "days_per_week", "session_min", "injuries", "equipment"] as const
export function programAffected(a: Profile, b: Profile): boolean   // отличается хоть одно поле PROGRAM_FIELDS (массивы — как множества)
export function restartProgram(old: Program | undefined, profile: Profile, latest: TestRow, today: string, exercises: Exercise[], history: SessionLog[], id = newId()): { deactivate?: Upsertable<"programs">; program: ProgramRows }
// cfg = { ...newConfig(profileInput(profile), { ...latest.results, date: latest.date }, today, id), blockIndex: old ? storedConfig(old).blockIndex : 0 }  (blockStart = today из newConfig)
// program = buildProgram(cfg, exercises, history, id); deactivate = old && { ...old без created_at/updated_at/user_id, active: false }
export function exportJson(rows: Rows, userId: string, exportedAt: string): string   // JSON.stringify({ app: "forma", version: 1, exportedAt, userId, tables: rows }, null, 2)
```

- [ ] **Step 1: Тест** (`profile.test.ts`):

```ts
import { all as exercises } from "@/features/exercises/useExercises"
import { META, ownerProfileRow, programRows } from "@/features/program/engine/fixtures/rows"
import type { StoredConfig } from "@/features/program/model"
import { historyFor } from "@/features/program/programService"
import { emptyRows } from "@/lib/db"
import { TABLES, type TestRow } from "@/lib/schema"
import { exportJson, programAffected, restartProgram } from "./profile"

const test: TestRow = { id: "t", ...META, date: "2026-10-12", kind: "baseline", results: { pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } } }

it("programAffected ignores cosmetic fields and array order", () => {
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, height_cm: 181, figure: "female", activity_level: "high" })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, equipment: [...ownerProfileRow.equipment].reverse() })).toBe(false)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, goal: "tone" })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, injuries: [] })).toBe(true)
  expect(programAffected(ownerProfileRow, { ...ownerProfileRow, days_per_week: 4 })).toBe(true)
})
it("restartProgram deactivates the old program and keeps its block index on a new id starting today", () => {
  const rows = programRows()
  rows.programs.p1 = { ...rows.programs.p1, config: { ...(rows.programs.p1.config as StoredConfig), blockIndex: 1 } }
  const profile = { ...ownerProfileRow, goal: "tone" as const, days_per_week: 4 as const }
  const out = restartProgram(rows.programs.p1, profile, test, "2026-10-19", exercises, historyFor(rows), "p2")   // Monday → full first week
  expect(out.deactivate).toMatchObject({ id: "p1", active: false })
  expect(out.program.program).toMatchObject({ id: "p2", start_date: "2026-10-19", goal: "tone", template: "upperlower", active: true })
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 1, blockStart: "2026-10-19", seed: "p2", latestTest: { ...test.results, date: "2026-10-12" }, profile: { goal: "tone", days_per_week: 4 } })
  expect(out.program.sessions).toHaveLength(16)
  expect(out.program.sessions[0].date).toBe("2026-10-19")
  expect(out.program.sessions.every((s) => s.program_id === "p2")).toBe(true)
})
it("restartProgram without an old program starts block 0 and deactivates nothing", () => {
  const out = restartProgram(undefined, ownerProfileRow, test, "2026-10-12", exercises, [], "p3")
  expect(out.deactivate).toBeUndefined()
  expect(out.program.program.config as StoredConfig).toMatchObject({ blockIndex: 0, blockStart: "2026-10-12" })
  expect(out.program.sessions).toHaveLength(12)
})
it("exportJson round-trips every table", () => {
  const rows = programRows()
  const parsed = JSON.parse(exportJson(rows, "local", "2026-10-12T10:00:00.000Z")) as { app: string; version: number; exportedAt: string; userId: string; tables: Record<string, unknown> }
  expect(parsed).toMatchObject({ app: "forma", version: 1, exportedAt: "2026-10-12T10:00:00.000Z", userId: "local" })
  expect(Object.keys(parsed.tables)).toEqual([...TABLES])
  expect(parsed.tables).toEqual(JSON.parse(JSON.stringify(rows)))
  expect(JSON.parse(exportJson(emptyRows(), "local", "x")).tables.workouts).toEqual({})
})
```

- [ ] **Step 2: Run** `npx vitest run src/features/profile/profile.test.ts` → FAIL. **Step 3:** по одной функции, коммит после зелёного своего `it`: `PROGRAM_FIELDS`+`programAffected` (`feat(profile): program-affecting diff`), `restartProgram` (`feat(profile): restart program`), `exportJson` (`feat(profile): export json`). **Step 4: Run** → PASS (4 теста).

- [ ] **Step 5: `SyncStatus.tsx`** — перенести функцию `SyncStatus` из `src/app/pages/ProfilePage.tsx` без изменений логики (локальный режим / загрузка / «Войти» / e-mail + «не отправлено: N» + «Выйти»), добавить `const err = useDb((s) => s.lastSyncError)` и под статусом `err && <p className="text-destructive">Ошибка синхронизации: {err}</p>`. Commit `refactor(profile): move sync status to feature`.

- [ ] **Step 6: `ProfileForm.tsx`** — `ProfileForm({ profile, open, onOpenChange, onSaved }: { profile: Profile; open: boolean; onOpenChange: (o: boolean) => void; onSaved: (next: Profile) => void })`: `Drawer` «Анкета»; локальная копия `draft` (`useState(profile)`, сброс при открытии); поля: `ChoiceGroup` пол (`sex`, обновляет и `figure`), `Input` год рождения / рост; `ChoiceGroup` цель (`GOAL_RU`), опыт (`EXPERIENCE_RU`), активность (`ACTIVITY_RU`); дни в неделю `ChoiceGroup` 2/3/4 (`hint` — `trainingDays(d)`), длительность 20/30/45; `MultiChoice` инвентарь (`EQUIPMENT_RU`, без `chair`/`wall`), травмы (`INJURY_RU`); «Сохранить» → `upsert("profiles", { ...draft, id: profile.id })`, `onSaved(draft)`, `toast.success("Анкета обновлена")`, закрыть. Commit `feat(profile): profile form`.

- [ ] **Step 7: `ProfilePage.tsx`** — `rows`, `userId`, `profile = rows.profiles[userId]`; нет профиля → `EmptyState icon={ClipboardList} title="Анкеты пока нет" action=<Link to="/onboarding">Заполнить</Link>` и ниже `SyncStatus` (вход возможен до анкеты). Секции (`h2 text-sm uppercase text-muted-foreground`):
  - **Аккаунт** — `<SyncStatus />`.
  - **Анкета** — `Card`: «{sex: Мужчина/Женщина}, {year − birth_year} лет, {height_cm} см», «{GOAL_RU[goal]} · {EXPERIENCE_RU[experience]} · {ACTIVITY_RU[activity_level]}», «{days_per_week} дн/нед ({trainingDays(days)}) · {session_min} мин», инвентарь и травмы через `EQUIPMENT_RU`/`INJURY_RU` (`Badge variant="secondary"`), кнопка «Изменить» → `ProfileForm`; `onSaved(next)`: если `programAffected(profile, next) && activeProgram(rows)` → открыть `Dialog` «Пересобрать программу?» («Цель, режим, инвентарь или травмы изменились. Новая программа начнётся сегодня, текущий блок закроется. Прогресс и история останутся.») с кнопками «Пересобрать» / «Оставить как есть».
  - **Программа** — `active = activeProgram(rows)`: есть → «Блок {blockIndex + 1} с {fmtDate(blockStart)} · старт программы {fmtDate(start_date)} · {DAY_RU-набор: template === "upperlower" ? "Верх / Низ" : "Full-body A/B"}»; `Button variant="outline"` «Пересобрать программу» → тот же `Dialog`; `latest = latestTest(rows)` → подпись «по тесту {KIND_RU[kind]} от {fmtDate(date)}»; без теста кнопка `disabled` и текст «Сначала пройди тест на чекпоинте» + `Link to="/checkpoint"`. Пересборка: `const out = restartProgram(active, profile, latest, today, exercises, historyFor(rows))`; `out.deactivate && upsert("programs", out.deactivate)`; `upsert("programs", out.program.program)`; `out.program.sessions.forEach(s => upsert("planned_sessions", s))`; `toast.success("Новая программа готова")`; `navigate("/")`.
  - **Внешний вид** — `const { theme, setTheme } = useTheme()`; `ChoiceGroup columns={3}` «Системная» / «Светлая» / «Тёмная» (`"system" | "light" | "dark"`); `ChoiceGroup columns={2}` фигура в демо упражнений «Мужская» / «Женская» → `upsert("profiles", { ...profile, figure })`.
  - **Данные** — `Button variant="outline"` «Экспорт JSON» (`Download`) → `new Blob([exportJson(rows, userId, new Date().toISOString())], { type: "application/json" })` → `a.download = \`forma-${todayISO()}.json\``, `a.click()`, `URL.revokeObjectURL`; `Button variant="ghost" className="text-destructive"` «Очистить данные на устройстве» → `Dialog` («Удалит анкету, программу и тренировки с этого устройства. Данные в облаке (если вход выполнен) останутся и подтянутся при следующем входе.») → `localStorage.removeItem` для `forma-db`, `forma-onboarding`, `forma-active-workout` → `location.reload()`.
  - `<Disclaimer className="pt-4" />`, строка версии `v{__APP_VERSION__}` — **нет**: вместо этого `import.meta.env.MODE` не показывать; просто «Forma · данные только твои».
  Маршрут → `@/features/profile/ProfilePage`; удалить `src/app/pages/ProfilePage.tsx`. `AppLayout`: `const dot = useDb((s) => s.pending.length > 0 || s.lastSyncError !== null)` → на ссылке профиля `relative` + `{dot && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />}`. Run `npm run lint && npm run typecheck && npm run build` → PASS. Commit `feat(profile): profile page`.

- [ ] **Step 8: Финальная проверка v1 (телефон 390×844 DPR 3, затем десктоп).** Dev-сервер: очистить `localStorage` (три ключа) и пройти сквозной сценарий спеки §11 без Supabase (локальный режим): `/forma/` → анкета (`onb-*.png`) → `/forma/` сессия или отдых → календарь → старт тренировки (через «Сегодня» либо из календаря за прошедшую дату) → два сета → перезагрузка страницы → черновик на месте → завершить с RPE → `/forma/` «Сделано» → `/forma/progress` замер → `/forma/nutrition` цель и меню → `/forma/checkpoint` ретест с разблокировкой → `/forma/` новый блок → `/forma/profile`: смена цели → «Пересобрать» → новая программа; экспорт JSON скачивается (проверить, что ссылка `download` сработала — файл в папке загрузок Playwright или `blob:` URL создан); тема «Тёмная» меняет фон. Скриншоты каждого экрана `_screens/final-*.png`, все просмотреть глазами (переполнение, обрезанные подписи, перекрытие нижней навигацией). Expected: ни одного экрана с NaN/undefined/«[object Object]», ни одной ошибки в консоли (`browser_console_messages` level error → пусто, кроме ожидаемых 404 отсутствующих картинок, если есть). Правки — коммиты `fix(<feature>): …` с тестом, где это логика.
  PWA: `npm run build && npx vite preview --port 4173` → `http://localhost:4173/forma/`: `document.querySelector('link[rel=manifest]')` есть, `navigator.serviceWorker.getRegistrations()` → 1 после загрузки; CDP `Network.emulateNetworkConditions { offline: true }` → перезагрузка `/forma/calendar` рендерится из кэша (SPA fallback) → вернуть сеть. Desktop (развёрнутое окно 1707 CSS, DPR 1.5): `final-desktop-*.png` для «Сегодня», «Прогресс», «Питание» — колонки `md:max-w-3xl` не разъезжаются.
  Удалить `_screens/*.png`; `_screens/` оставить пустой.

- [ ] **Step 9: Run** `npm run lint && npm run typecheck && npm test && npm run build` → PASS. Commit остатка `chore: v1 polish`. Push → деплой зелёный → `https://yankeez2505.github.io/forma/` открывается, `/forma/calendar` по прямой ссылке — тоже (404.html fallback).

---

## Самопроверка плана (выполнено при написании)

- Спека §11 (сквозной сценарий): вход по коду — часть 1 (`/auth`); онбординг + тест — Task 2; блок в календаре — Task 2 + 5; тренировка с логом офлайн — Task 3 (черновик `forma-active-workout`, `upsert` в `forma-db` + `pending`); данные в Supabase — часть 1 `startSync` (push `pending` при `online`); чек-ин — Task 4; ретест на чекпоинте — Task 7; графики — Task 6; питание — Task 8–9.
- Все `Review Focus` закреплены за задачами: 1 → Task 3 (`resumeDecision` + Step 8 Task 4), 2 → Task 5 (`DaySheet` только `date <= today`), 3 → Task 7 (`ankleStatus` + finisher с impact после разблокировки), 4 → Task 6 (пустые карточки без веса), 5 → Task 9 (`needsNewTarget`).
- Типы сквозные: `StoredConfig`, `ProgramRows`, `SessionPlan`, `TestDraft`, `MenuItem` используются с одинаковыми сигнатурами во всех задачах.
