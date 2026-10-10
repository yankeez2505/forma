# Forma v1 — план реализации, часть 1: фундамент

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Развёрнутый на GitHub Pages скелет Forma с локальным хранилищем данных, синхронизацией Supabase за env-флагом, каталогом упражнений (фото + 3D-демо мужчина/женщина) и протестированными чистыми модулями расчётов и генератора программы.

**Architecture:** Vite SPA, пользовательские данные в одном Zustand-сторе `db` (persist, таблицы 1:1 с Supabase), `sync` зеркалит несинхронизированные строки через `upsert`. Контент — JSON в репо, собирается скриптом из free-exercise-db + ручной слой. Генератор программы — чистые функции `engine/*`, 3D — процедурный персонаж на react-three-fiber с позами из JSON.

**Tech Stack:** Vite 8, React 19.3, TypeScript 6, Tailwind 4 + shadcn (radix-nova) + lucide-react, react-router 7, zustand 5, @supabase/supabase-js 2, three 0.186 + @react-three/fiber 9 + @react-three/drei 10, vite-plugin-pwa 2, vitest 5, tsx + sharp + zod (скрипты).

**Spec:** `docs/superpowers/specs/2026-10-10-forma-design.md`

Часть 2 (экраны: онбординг, тренировка, календарь, аналитика, чекпоинты, питание, полировка) — отдельный план `2026-10-10-forma-screens.md`, пишется после завершения части 1, когда интерфейсы фундамента зафиксированы.

## Global Constraints

- Папка проекта `D:\Vibe Design\traning` (имя пакета и репо — `forma`); `base: '/forma/'`; URL `https://yankeez2505.github.io/forma/`.
- Любой файл кода ≤200 строк; модули `engine/*` ≤150 строк. Новый файл: скелет → commit → по одной функции → commit.
- Коммиты `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`, каждый коммит — рабочее состояние (`npm test` и `npm run build` зелёные).
- Тексты UI — русский; код, идентификаторы, slug — английский.
- `.env` не коммитить. Переменные: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Без них приложение работает локально.
- Даты в данных — `YYYY-MM-DD` в локальной зоне; `id` — uuid с клиента; у каждой строки `user_id`, `created_at`, `updated_at`.
- Mobile-first: основной вьюпорт 390×844; десктоп — ширина контента ≤ 960px по центру.
- Временные файлы/скриншоты — только в `_screens/` (в gitignore), удалять в конце задачи.

## Review Focus

1. Ввод e-mail с пробелами/заглавными → `signInWithOtp` должен получить `trim().toLowerCase()`; код OTP вводится с пробелами → убрать всё, кроме цифр. Тесты — Task 6.
2. Запуск без сети при первом открытии → контент (JSON, webp) доступен из прекэша, страницы не падают на пустом `db`. Проверка — Task 3 (прекэш) и Task 5 (пустой стор).
3. Профиль без теста (`latestTest` undefined) → `deriveRestrictions` считает ударку заблокированной при `injuries` содержащем `ankle`, иначе разрешённой; не падает. Тест — Task 12.
4. Инвентарь без гантелей и резинки → пул всё равно заполняет каждый обязательный паттерн bodyweight-вариантами. Тест — Task 12.
5. Повторный `upsert` той же строки офлайн → в `pending` одна запись на `(table,id)`, не дубли; `updated_at` обновляется. Тест — Task 5.

---

## File Structure

```
package.json, vite.config.ts, tsconfig*.json, components.json, index.html
.github/workflows/deploy.yml           # build + Pages
.github/workflows/keepalive.yml        # cron: select 1 через REST, если секреты заданы
public/icon.svg, public/pwa-192.png, public/pwa-512.png, public/exercises/<slug>/{0,1}.webp
content-src/exercises.curated.json     # ручной слой (80 упражнений)
content-src/exercises.ru.json          # переводы {slug:{name,cues[],reviewed}}
content-src/anims/<slug>.json          # позы 3D
scripts/build-exercises.ts             # сборка контента
scripts/icons.ts                       # svg → png
supabase/migrations/0001_init.sql
src/main.tsx, src/index.css
src/app/router.tsx                     # маршруты
src/app/AppLayout.tsx                  # шапка + нижняя навигация + <Outlet/>
src/app/BottomNav.tsx
src/app/pages/*.tsx                    # заглушки экранов части 2
src/components/ui/*                    # shadcn
src/components/theme-provider.tsx      # из шаблона
src/lib/utils.ts, id.ts, dates.ts, schema.ts, db.ts, supabase.ts, sync.ts
src/lib/calc/{bmr,tdee,targets,navyBodyFat,bmi,rolling}.ts (+ .test.ts)
src/content/types.ts, exercises.json, anims/index.ts
src/features/auth/{AuthPage.tsx,useSession.ts,RequireAuth.tsx}
src/features/exercises/{ExercisesPage.tsx,ExercisePage.tsx,ExerciseCard.tsx,useExercises.ts}
src/features/exercises/figure/{Figure.tsx,bodyPresets.ts,pose.ts,pose.test.ts,usePosePlayer.ts,ExerciseFigure.tsx}
src/features/program/engine/{types,seed,restrictions,pool,templates,baseline,periodization,progression,autoregulate,warmup,goals,schedule,generateBlock}.ts (+ .test.ts)
src/features/program/engine/fixtures/owner.ts   # фикстура Артёма
src/app/pages/DevPreviewPage.tsx                # /dev/preview — «золотой» план
```

---

### Task 1: Скелет проекта из шаблона shadcn (Vite) + деплой на Pages

**Files:**
- Create: всё из шаблона (`package.json`, `vite.config.ts`, `tsconfig*.json`, `components.json`, `index.html`, `src/*`, `eslint.config.js`), `.github/workflows/deploy.yml`
- Modify: `package.json` (name, scripts), `vite.config.ts` (base), `index.html` (lang, title, viewport), `src/index.css` (шрифт Onest), `src/App.tsx`

**Interfaces:**
- Produces: `npm run dev|build|test|lint`, alias `@/` → `src/`, `cn()` из `@/lib/utils`, shadcn `add` работает (`components.json`).

- [ ] **Step 1: Сгенерировать шаблон во временной папке и скопировать в проект**

```bash
cd "$SCRATCH" && npx -y shadcn@latest init -t vite -b radix -p nova -n forma -y
# копировать всё кроме node_modules, README.md, .git
cd "/d/Vibe Design/traning" && cp -r "$SCRATCH/forma/." . && rm -rf node_modules README.md
```
Проверить: в проекте есть `components.json` со `"style": "radix-nova"`, `src/components/ui/button.tsx`, `src/components/theme-provider.tsx`.

- [ ] **Step 2: package.json — имя и скрипты**

```json
"name": "forma",
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build && cp dist/index.html dist/404.html",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit -p tsconfig.app.json",
  "content": "tsx scripts/build-exercises.ts",
  "icons": "tsx scripts/icons.ts"
}
```
`cp` в Windows-окружении Actions (ubuntu) есть; локально Git Bash тоже. Установить: `npm i -D vitest tsx` и шрифт `npm i @fontsource-variable/onest`, удалить `@fontsource-variable/geist`.

- [ ] **Step 3: vite.config.ts — base и vitest**

```ts
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: "/forma/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
```
Если `test` не типизируется — `import { defineConfig } from "vitest/config"`.

- [ ] **Step 4: index.html**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/forma/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>Forma</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
Создать `public/icon.svg` — буква «F» на скруглённом квадрате:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0a0a0a"/><path d="M160 128h208v64H232v72h112v64H232v56h-72z" fill="#a3e635"/></svg>
```

- [ ] **Step 5: index.css — шрифт Onest вместо Geist**

Заменить строку `@import "@fontsource-variable/geist";` на `@import "@fontsource-variable/onest";` и `--font-sans: 'Geist Variable', sans-serif;` на `--font-sans: 'Onest Variable', system-ui, sans-serif;`. Акцент: в `:root` и `.dark` заменить `--primary` на `oklch(0.84 0.2 128)` (лайм) и `--primary-foreground` на `oklch(0.17 0.03 128)`.

- [ ] **Step 6: App.tsx — минимальная заглушка**

```tsx
export default function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Forma</h1>
      <p className="text-muted-foreground">Скелет развёрнут.</p>
    </main>
  )
}
```
`src/main.tsx` оставить (ThemeProvider из шаблона).

- [ ] **Step 7: Проверить сборку локально**

Run: `npm install && npm run build && npm run test`
Expected: `dist/index.html` и `dist/404.html` существуют; vitest: «No test files found» допустимо на этом шаге (добавить `passWithNoTests: true` в `test`).

- [ ] **Step 8: Workflow деплоя**

`.github/workflows/deploy.yml`:
```yaml
name: deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Commit + push, дождаться деплоя**

```bash
git add -A && git commit -m "feat: project skeleton (vite, shadcn, tailwind) and Pages deploy"
git push && gh run watch --exit-status
curl -s https://yankeez2505.github.io/forma/ | grep -o "<title>Forma</title>"
```

---

### Task 2: Оболочка приложения — роутер, нижняя навигация, заглушки экранов

**Files:**
- Create: `src/app/router.tsx`, `src/app/AppLayout.tsx`, `src/app/BottomNav.tsx`, `src/app/pages/{TodayPage,CalendarPage,ExercisesPage,ProgressPage,NutritionPage,ProfilePage,NotFoundPage}.tsx`
- Modify: `src/main.tsx` (RouterProvider вместо App), удалить `src/App.tsx`

**Interfaces:**
- Produces: маршруты `/`, `/calendar`, `/exercises`, `/exercises/:slug`, `/progress`, `/nutrition`, `/profile`, `/auth`, `/dev/preview`, `*`; компонент `<AppLayout/>` с `<Outlet/>`; часть 2 заменяет содержимое страниц, не трогая роутер.

- [ ] **Step 1: Установить react-router 7 и компоненты shadcn**

```bash
npm i react-router@^7
npx shadcn@latest add -y button card badge tabs input label separator skeleton sheet drawer dialog select switch progress scroll-area tooltip sonner
```

- [ ] **Step 2: Страницы-заглушки** — одна функция на файл, пример `TodayPage.tsx`:

```tsx
export default function TodayPage() {
  return <section className="p-4"><h1 className="text-2xl font-semibold">Сегодня</h1></section>
}
```
Заголовки: Сегодня, Календарь, Упражнения, Прогресс, Питание, Профиль, «Страница не найдена».

- [ ] **Step 3: BottomNav.tsx**

```tsx
import { NavLink } from "react-router"
import { CalendarDays, Dumbbell, Home, LineChart, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { to: "/", label: "Сегодня", Icon: Home },
  { to: "/calendar", label: "Календарь", Icon: CalendarDays },
  { to: "/exercises", label: "Упражнения", Icon: Dumbbell },
  { to: "/progress", label: "Прогресс", Icon: LineChart },
  { to: "/nutrition", label: "Питание", Icon: Utensils },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === "/"} className={({ isActive }) =>
              cn("flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground", isActive && "text-primary")}>
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 4: AppLayout.tsx**

```tsx
import { Link, Outlet } from "react-router"
import { UserRound } from "lucide-react"
import { BottomNav } from "./BottomNav"

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-svh max-w-md pb-20 md:max-w-3xl">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <Link to="/" className="text-lg font-semibold tracking-tight">Forma</Link>
        <Link to="/profile" aria-label="Профиль" className="rounded-full p-2 hover:bg-accent"><UserRound className="size-5" /></Link>
      </header>
      <Outlet />
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 5: router.tsx и main.tsx**

```tsx
// src/app/router.tsx
import { createBrowserRouter } from "react-router"
import AppLayout from "./AppLayout"
import TodayPage from "./pages/TodayPage"
// ...остальные импорты страниц

export const router = createBrowserRouter(
  [{
    path: "/", element: <AppLayout />, children: [
      { index: true, element: <TodayPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "exercises", element: <ExercisesPage /> },
      { path: "exercises/:slug", element: <ExercisesPage /> },
      { path: "progress", element: <ProgressPage /> },
      { path: "nutrition", element: <NutritionPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  }],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
)
```
```tsx
// src/main.tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { router } from "@/app/router"

createRoot(document.getElementById("root")!).render(
  <StrictMode><ThemeProvider><RouterProvider router={router} /></ThemeProvider></StrictMode>,
)
```

- [ ] **Step 6: Проверить** `npm run build`, `npm run dev` → открыть `/forma/`, `/forma/calendar`; перезагрузка на вложенном пути работает в dev; после деплоя — `curl -I https://yankeez2505.github.io/forma/calendar` → 404 со содержимым index (SPA-fallback через 404.html).

- [ ] **Step 7: Commit** `feat: app shell with router and bottom navigation` → push.

---

### Task 3: PWA — манифест, иконки, прекэш

**Files:**
- Create: `scripts/icons.ts`, `public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`
- Modify: `vite.config.ts`, `index.html` (apple-touch-icon), `package.json`

- [ ] **Step 1: Иконки** — `npm i -D sharp`, `scripts/icons.ts`:

```ts
import sharp from "sharp"
const svg = "public/icon.svg"
for (const [name, size] of [["pwa-192.png", 192], ["pwa-512.png", 512], ["apple-touch-icon.png", 180]] as const) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`)
}
```
Run: `npm run icons`. В `index.html` добавить `<link rel="apple-touch-icon" href="/forma/apple-touch-icon.png" />`.

- [ ] **Step 2: vite-plugin-pwa** — `npm i -D vite-plugin-pwa`, в `plugins`:

```ts
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["icon.svg", "apple-touch-icon.png"],
  manifest: {
    name: "Forma", short_name: "Forma", description: "Персональные тренировки и питание",
    lang: "ru", start_url: "/forma/", scope: "/forma/", display: "standalone",
    background_color: "#0a0a0a", theme_color: "#0a0a0a",
    icons: [
      { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  },
  workbox: {
    navigateFallback: "/forma/index.html",
    globPatterns: ["**/*.{js,css,html,svg,png,woff2,json}"],
    runtimeCaching: [
      { urlPattern: /\.supabase\.co\//, handler: "NetworkOnly" },
      { urlPattern: /\/forma\/exercises\/.*\.webp$/, handler: "CacheFirst",
        options: { cacheName: "exercise-images", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 } } },
    ],
  },
})
```
webp упражнений не в прекэше (объём), а в CacheFirst при первом просмотре.

- [ ] **Step 3: Проверить** `npm run build` → в `dist/` есть `manifest.webmanifest`, `sw.js`. Commit `feat: pwa manifest and service worker` → push → на телефоне «Добавить на экран» (проверка Артёмом).

---

### Task 4: Утилиты — id и даты (TDD)

**Files:**
- Create: `src/lib/id.ts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`

**Interfaces:**
- Produces: `newId(): string` (uuid v4); `todayISO(now?: Date): string`; `toISODate(d: Date): string`; `addDays(iso: string, n: number): string`; `startOfWeek(iso: string): string` (понедельник); `weekday(iso: string): 0..6` (0 = понедельник); `diffDays(a: string, b: string): number`.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest"
import { addDays, diffDays, startOfWeek, toISODate, weekday } from "./dates"

describe("dates", () => {
  it("toISODate uses local date, not UTC", () => {
    expect(toISODate(new Date(2026, 9, 10, 23, 30))).toBe("2026-10-10")
  })
  it("addDays crosses month", () => expect(addDays("2026-10-30", 3)).toBe("2026-11-02"))
  it("startOfWeek returns Monday", () => {
    expect(startOfWeek("2026-10-10")).toBe("2026-10-05") // суббота → понедельник
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05")
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05") // воскресенье
  })
  it("weekday: Monday is 0", () => expect(weekday("2026-10-05")).toBe(0))
  it("diffDays", () => expect(diffDays("2026-10-01", "2026-10-10")).toBe(9))
})
```

- [ ] **Step 2: Run** `npm test` → FAIL (module not found).

- [ ] **Step 3: Реализация** — все функции парсят `YYYY-MM-DD` как локальную дату (`new Date(y, m-1, d)`), никогда `new Date(iso)`:

```ts
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const todayISO = (now = new Date()) => toISODate(now)
export const parseISO = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d) }
export const addDays = (iso: string, n: number) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISODate(d) }
export const weekday = (iso: string) => (parseISO(iso).getDay() + 6) % 7
export const startOfWeek = (iso: string) => addDays(iso, -weekday(iso))
export const diffDays = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
```
`id.ts`: `export const newId = () => crypto.randomUUID()`.

- [ ] **Step 4: Run** `npm test` → PASS. **Commit** `feat: date and id utilities`.

---

### Task 5: Схема и локальная БД (`db` store)

**Files:**
- Create: `src/lib/schema.ts`, `src/lib/db.ts`, `src/lib/db.test.ts`

**Interfaces:**
- Produces типы строк (snake_case = колонки Supabase):

```ts
// src/lib/schema.ts
export type Goal = "fat" | "muscle" | "tone"
export type Sex = "male" | "female"
export type Experience = "none" | "some" | "regular"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high"
export type InjuryTag = "ankle" | "knee" | "lower_back" | "shoulder" | "wrist"
export type EquipmentTag = "dumbbell" | "band" | "mat" | "rope" | "roller" | "ball" | "chair" | "wall" | "bar"

interface Base { id: string; user_id: string; created_at: string; updated_at: string }
export interface Profile extends Base {           // id === user_id
  sex: Sex; birth_year: number; height_cm: number; country: string; timezone: string
  goal: Goal; experience: Experience; days_per_week: 2 | 3 | 4; session_min: 20 | 30 | 45
  activity_level: ActivityLevel; injuries: InjuryTag[]; equipment: EquipmentTag[]; figure: Sex
}
export interface BodyMetric extends Base { date: string; weight_kg: number | null; waist_cm: number | null; neck_cm: number | null; hip_cm: number | null }
export interface AnkleTest { knee_to_wall_diff_cm: number; single_leg_calf_raises: number; balance_eyes_closed_s: number }
export interface TestRow extends Base { date: string; kind: "baseline" | "checkpoint"; results: { pushups: number; squats: number; plank_s: number; ankle?: AnkleTest } }
export interface Program extends Base { start_date: string; goal: Goal; template: "fullbody" | "upperlower"; config: unknown; active: boolean }
export interface PlannedSession extends Base { program_id: string; date: string; week: 1 | 2 | 3 | 4; day_type: "A" | "B" | "U" | "L"; exercises: unknown[]; est_min: number }
export interface Workout extends Base { planned_session_id: string | null; started_at: string; finished_at: string | null; pre_soreness: number | null; pre_sleep: number | null; pre_energy: number | null; rpe: number | null; notes: string | null }
export interface WorkoutSet extends Base { workout_id: string; exercise_id: string; set_no: number; reps: number | null; duration_s: number | null; weight_kg: number | null; band_kg: number | null; rir: number | null }
export interface NutritionTarget extends Base { date_from: string; kcal: number; protein_g: number; fat_g: number; carbs_g: number }

export interface Tables {
  profiles: Profile; body_metrics: BodyMetric; tests: TestRow; programs: Program
  planned_sessions: PlannedSession; workouts: Workout; workout_sets: WorkoutSet; nutrition_targets: NutritionTarget
}
export type TableName = keyof Tables
export const TABLES: TableName[] = ["profiles", "body_metrics", "tests", "programs", "planned_sessions", "workouts", "workout_sets", "nutrition_targets"]
```
- `db.ts` (zustand persist, key `forma-db`, `createJSONStorage(() => localStorage)`; в тестах — in-memory):

```ts
export interface DbState {
  rows: { [T in TableName]: Record<string, Tables[T]> }
  pending: string[]                       // `${table}:${id}` без дублей
  userId: string                          // "local" до входа; при входе заменяется на auth uid во всех строках
  upsert<T extends TableName>(table: T, row: Omit<Tables[T], "user_id" | "created_at" | "updated_at"> & Partial<Pick<Tables[T], "user_id" | "created_at" | "updated_at">>): Tables[T]
  remove(table: TableName, id: string): void
  markSynced(keys: string[]): void
  replaceAll(rows: DbState["rows"]): void          // после pull с сервера
  adoptUser(userId: string): void                  // local → uid, все строки в pending
}
export const useDb = create<DbState>()(persist(...))
export const selectRows = <T extends TableName>(table: T) => (s: DbState) => Object.values(s.rows[table])
```
`upsert`: `created_at` сохраняется из существующей строки, `updated_at = new Date().toISOString()`, `user_id = state.userId`, ключ добавляется в `pending`, если его там нет.

- [ ] **Step 1: Тест** (`db.test.ts`)

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { useDb } from "./db"

beforeEach(() => useDb.getState().replaceAll(emptyRows()))   // emptyRows экспортируется из db.ts

describe("db store", () => {
  it("upsert fills user_id/timestamps and queues once", () => {
    const { upsert } = useDb.getState()
    const a = upsert("body_metrics", { id: "m1", date: "2026-10-10", weight_kg: 80, waist_cm: null, neck_cm: null, hip_cm: null })
    expect(a.user_id).toBe("local")
    expect(a.created_at).toBeTruthy()
    upsert("body_metrics", { ...a, weight_kg: 79 })
    const s = useDb.getState()
    expect(s.rows.body_metrics.m1.weight_kg).toBe(79)
    expect(s.rows.body_metrics.m1.created_at).toBe(a.created_at)
    expect(s.pending).toEqual(["body_metrics:m1"])
  })
  it("markSynced clears keys; remove deletes row and key", () => {
    useDb.getState().upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 10, squats: 20, plank_s: 40 } })
    useDb.getState().markSynced(["tests:t1"])
    expect(useDb.getState().pending).toEqual([])
    useDb.getState().remove("tests", "t1")
    expect(useDb.getState().rows.tests.t1).toBeUndefined()
  })
  it("adoptUser rewrites user_id and requeues everything", () => {
    useDb.getState().upsert("tests", { id: "t1", date: "2026-10-10", kind: "baseline", results: { pushups: 1, squats: 1, plank_s: 1 } })
    useDb.getState().markSynced(["tests:t1"])
    useDb.getState().adoptUser("uid-1")
    expect(useDb.getState().rows.tests.t1.user_id).toBe("uid-1")
    expect(useDb.getState().pending).toEqual(["tests:t1"])
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** реализовать `schema.ts`, затем `db.ts` (скелет стора → commit → `upsert` → `remove/markSynced` → `replaceAll/adoptUser`). persist storage: `createJSONStorage(() => (typeof localStorage === "undefined" ? memoryStorage : localStorage))`, где `memoryStorage` — объект с Map.

- [ ] **Step 4: Run** → PASS. Проверить `npm run build`. **Commit** `feat: local db store mirroring supabase tables`.

---

### Task 6: Supabase-клиент, синхронизация, вход по OTP

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/sync.ts`, `src/lib/sync.test.ts`, `src/features/auth/useSession.ts`, `src/features/auth/AuthPage.tsx`, `src/features/auth/email.ts`, `src/features/auth/email.test.ts`
- Modify: `src/app/router.tsx` (`/auth`), `src/app/pages/ProfilePage.tsx` (статус синхронизации, кнопка входа/выхода), `.env.example`

**Interfaces:**
- `supabase.ts`: `export const supabase: SupabaseClient | null` (null, если нет env); `export const syncEnabled = supabase !== null`.
- `sync.ts`: `pushPending(client, db = useDb): Promise<number>` — группирует pending по таблице, `client.from(table).upsert(rows, { onConflict: "id" })`, при успехе `markSynced`; `pullAll(client, db): Promise<void>` — `select('*')` по всем таблицам → `replaceAll` (слияние: серверная строка побеждает, если её `updated_at` новее); `startSync(client)` — вызывает `pushPending` при `online`, при старте и при каждом изменении `pending` (debounce 1 с).
- `email.ts`: `normalizeEmail(s: string): string` → `trim().toLowerCase()`; `normalizeOtp(s: string): string` → только цифры, 6 символов.
- `useSession()`: `{ session, loading, signIn(email), verify(email, code), signOut() }` поверх `supabase.auth`; при входе — `useDb.getState().adoptUser(uid)` → `pullAll` → `pushPending`.

- [ ] **Step 1: Тесты** — `email.test.ts`:

```ts
expect(normalizeEmail("  Kasatkin@Gmail.com ")).toBe("kasatkin@gmail.com")
expect(normalizeOtp(" 12 34-56 ")).toBe("123456")
```
`sync.test.ts` с фейковым клиентом:
```ts
const calls: Array<{ table: string; rows: unknown[] }> = []
const fake = { from: (table: string) => ({ upsert: async (rows: unknown[]) => { calls.push({ table, rows }); return { error: null } } }) }
it("pushPending upserts grouped by table and clears queue", async () => {
  useDb.getState().upsert("tests", {...}); useDb.getState().upsert("tests", {...id: "t2"}); useDb.getState().upsert("body_metrics", {...})
  const n = await pushPending(fake as never)
  expect(n).toBe(3); expect(calls.map(c => c.table).sort()).toEqual(["body_metrics", "tests"]); expect(useDb.getState().pending).toEqual([])
})
it("keeps queue when upsert fails", async () => { /* fake возвращает { error: {message:"x"} } → pending не пустой, n === 0 */ })
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Реализация** — `supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js"
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = url && key ? createClient(url, key) : null
export const syncEnabled = supabase !== null
```
`npm i @supabase/supabase-js`. `.env.example` с двумя пустыми переменными.

- [ ] **Step 4: AuthPage** — два шага: e-mail → «Отправить код» (`signInWithOtp({ email, options: { shouldCreateUser: true } })`); код → «Войти» (`verifyOtp({ email, token, type: "email" })`); ошибки — текстом под полем. Если `!syncEnabled` — страница показывает: «Синхронизация выключена: добавь ключи Supabase в `.env`», данные остаются на устройстве.

- [ ] **Step 5: Run** тесты → PASS; `npm run build`; в dev без `.env` открыть `/profile` → плашка «Локальный режим». **Commit** `feat: supabase client, sync queue and otp auth`.

---

### Task 7: Миграция Supabase и keep-alive

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `.github/workflows/keepalive.yml`, `supabase/README.md`

- [ ] **Step 1: SQL** — для каждой таблицы из `schema.ts`:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sex text not null check (sex in ('male','female')),
  birth_year int not null, height_cm numeric not null, country text not null default 'BY', timezone text not null,
  goal text not null check (goal in ('fat','muscle','tone')),
  experience text not null, days_per_week int not null check (days_per_week between 2 and 4),
  session_min int not null, activity_level text not null,
  injuries jsonb not null default '[]', equipment jsonb not null default '[]', figure text not null default 'male',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.body_metrics (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, weight_kg numeric, waist_cm numeric, neck_cm numeric, hip_cm numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, date)
);
-- tests, programs (+ create unique index programs_one_active on programs(user_id) where active),
-- planned_sessions, workouts, workout_sets (exercise_id text), nutrition_targets — по schema.ts
alter table public.profiles enable row level security;  -- и для каждой таблицы
create policy "own rows" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- та же политика для каждой таблицы
```
Полный файл — все 8 таблиц, RLS на каждой, политика `own rows`. `supabase/README.md`: как применить (SQL Editor → вставить файл), как включить `{{ .Token }}` в шаблоне Magic Link, где взять URL и anon key, какие Secrets завести в репо.

- [ ] **Step 2: keepalive.yml**

```yaml
name: keepalive
on: { schedule: [{ cron: "17 6 * * *" }], workflow_dispatch: }
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - if: ${{ env.URL != '' }}
        env: { URL: ${{ secrets.VITE_SUPABASE_URL }}, KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} }
        run: curl -fsS "$URL/rest/v1/profiles?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" > /dev/null
```
Если секретов нет, шаг пропускается (`env.URL` пуст).

- [ ] **Step 3: Commit** `chore: supabase schema migration and keep-alive workflow`.

---

### Task 8: Контент упражнений — ручной слой, сборка, переводы, экран

**Files:**
- Create: `content-src/exercises.curated.json`, `content-src/exercises.ru.json`, `scripts/build-exercises.ts`, `src/content/types.ts`, `src/content/exercises.json` (генерируется), `public/exercises/<slug>/{0,1}.webp` (генерируется), `src/features/exercises/{useExercises.ts,ExerciseCard.tsx,ExercisesPage.tsx,ExercisePage.tsx}`
- Modify: `src/app/router.tsx` (`exercises/:slug` → `ExercisePage`), удалить заглушку `src/app/pages/ExercisesPage.tsx`

**Interfaces:**
- `src/content/types.ts`:

```ts
export type Pattern = "squat" | "hinge" | "lunge" | "push_h" | "push_v" | "pull_h" | "pull_v" | "core" | "calf" | "mobility" | "cardio" | "arms" | "shoulder_iso"
export type Muscle = "abdominals" | "hamstrings" | "adductors" | "quadriceps" | "biceps" | "shoulders" | "chest" | "middle back" | "calves" | "glutes" | "lower back" | "lats" | "triceps" | "traps" | "forearms" | "neck" | "abductors"
export interface Exercise {
  slug: string; sourceId: string | null; pattern: Pattern; level: 1 | 2 | 3
  equipment: EquipmentTag[]            // пусто = только тело/пол
  impact: boolean; contraindications: InjuryTag[]; difficultyRank: number
  timed: boolean; unilateral: boolean; anim: string | null
  primaryMuscles: Muscle[]; secondaryMuscles: Muscle[]; images: string[]   // "exercises/<slug>/0.webp"
  name: string; cues: string[]; reviewed: boolean
}
```
(`EquipmentTag`, `InjuryTag` импортируются из `@/lib/schema`.)
- `useExercises()` → `{ all: Exercise[], bySlug: Map<string, Exercise>, byPattern(p): Exercise[] }` поверх `import exercises from "@/content/exercises.json"`.
- Движок (Task 12) потребляет `Exercise[]` как есть.

- [ ] **Step 1: Ручной слой** — `content-src/exercises.curated.json`, массив объектов `{slug, sourceId, pattern, level, equipment, impact, contraindications, difficultyRank, timed, unilateral, anim}`. Полный список (slug ← sourceId; паттерн; уровень; инвентарь; ранг; флаги):

```
squat:      bodyweight-squat←Bodyweight_Squat L1 [] r1 anim | band-squat←Squats_-_With_Bands L1 [band] r2 | dumbbell-squat←Dumbbell_Squat L2 [dumbbell] r3 anim | plie-dumbbell-squat←Plie_Dumbbell_Squat L2 [dumbbell] r4 | jump-squat←Freehand_Jump_Squat L3 [] r5 impact
hinge:      glute-bridge←Butt_Lift_Bridge L1 [mat] r1 anim | band-hip-extension←Hip_Extension_with_Bands L1 [band] r2 | single-leg-glute-bridge←Single_Leg_Glute_Bridge L2 [mat] r3 unilateral anim | dumbbell-rdl←Stiff-Legged_Dumbbell_Deadlift L2 [dumbbell] r4 contra[lower_back] anim
lunge:      split-squat←Split_Squats L1 [] r1 unilateral anim | step-up-knee-raise←Step-up_with_Knee_Raise L1 [chair] r2 unilateral | walking-lunge←Bodyweight_Walking_Lunge L2 [] r3 unilateral | dumbbell-split-squat←Split_Squat_with_Dumbbells L2 [dumbbell] r4 unilateral | dumbbell-lunge←Dumbbell_Lunges L2 [dumbbell] r5 unilateral anim | dumbbell-rear-lunge←Dumbbell_Rear_Lunge L2 [dumbbell] r6 unilateral | dumbbell-step-up←Dumbbell_Step_Ups L3 [dumbbell,chair] r7 unilateral
push_h:     incline-push-up←Incline_Push-Up L1 [chair] r1 anim | push-up←Pushups L2 [] r2 anim | dumbbell-floor-press←Dumbbell_Bench_Press L2 [dumbbell,mat] r3 anim | wide-push-up←Push-Up_Wide L2 [] r4 | close-push-up←Push-Ups_-_Close_Triceps_Position L2 [] r5 | decline-push-up←Push-Ups_With_Feet_Elevated L3 [chair] r6 | push-up-to-side-plank←Push_Up_to_Side_Plank L3 [] r7 | plyo-push-up←Plyo_Push-up L3 [] r8 impact contra[wrist,shoulder]
push_v:     band-shoulder-press←Shoulder_Press_-_With_Bands L1 [band] r1 | dumbbell-shoulder-press←Standing_Dumbbell_Press L2 [dumbbell] r2 anim | arnold-press←Arnold_Dumbbell_Press L2 [dumbbell] r3 | one-arm-dumbbell-press←Dumbbell_One-Arm_Shoulder_Press L3 [dumbbell] r4 unilateral
pull_h:     band-pull-apart←Band_Pull_Apart L1 [band] r1 anim | one-arm-dumbbell-row←One-Arm_Dumbbell_Row L1 [dumbbell,chair] r2 unilateral anim | bent-over-dumbbell-row←Bent_Over_Two-Dumbbell_Row L2 [dumbbell] r3 anim | inverted-row←Inverted_Row L3 [bar] r4
pull_v:     dumbbell-pullover←Straight-Arm_Dumbbell_Pullover L2 [dumbbell,mat] r1 | scapular-pull-up←Scapular_Pull-Up L2 [bar] r2 | pull-up←Pullups L3 [bar] r3
core:       dead-bug←Dead_Bug L1 [mat] r1 anim | crunch←Crunches L1 [mat] r2 | superman←Superman L1 [mat] r3 contra[lower_back] | plank←Plank L1 [mat] r4 timed anim | reverse-crunch←Reverse_Crunch L2 [mat] r5 | side-plank←Side_Bridge L2 [mat] r6 timed unilateral anim | russian-twist←Russian_Twist L2 [mat] r7 contra[lower_back] | mountain-climbers←Mountain_Climbers L2 [] r8 impact
calf:       standing-calf-raise←Standing_Dumbbell_Calf_Raise L1 [] r1 anim | band-calf-raise←Calf_Raises_-_With_Bands L1 [band] r2 | single-leg-calf-raise←Calf_Raise_On_A_Dumbbell L2 [] r3 unilateral anim | seated-single-leg-calf-raise←Dumbbell_Seated_One-Leg_Calf_Raise L2 [dumbbell,chair] r4 unilateral
mobility:   ankle-circles←Ankle_Circles r1 timed | calf-stretch-wall←Calf_Stretch_Hands_Against_Wall r2 timed [wall] | soleus-stretch←Standing_Soleus_And_Achilles_Stretch r3 timed [wall] | kneeling-hip-flexor←Kneeling_Hip_Flexor r4 timed [mat] | cat-stretch←Cat_Stretch r5 timed [mat] | childs-pose←Childs_Pose r6 timed [mat] | worlds-greatest-stretch←Worlds_Greatest_Stretch r7 L2 | ninety-ninety-hamstring←90_90_Hamstring r8 timed [mat] | hamstring-smr←Hamstring-SMR r9 timed [roller] | quad-smr←Quadriceps-SMR r10 timed [roller] | shoulder-stretch←Shoulder_Stretch r11 timed | upper-back-stretch←Upper_Back_Stretch r12 timed | inchworm←Inchworm r13 | standing-hip-circles←Standing_Hip_Circles r14 timed | dynamic-chest-stretch←Dynamic_Chest_Stretch r15 timed | band-external-rotation←External_Rotation_with_Band r16 [band] | band-internal-rotation←Internal_Rotation_with_Band r17 [band]   (все L1 кроме указанных)
cardio:     fast-step-up←Step-up_with_Knee_Raise L1 [chair] r1 timed | mountain-climbers-cardio←Mountain_Climbers L2 [] r2 timed impact | jump-rope←null L2 [rope] r3 timed impact anim | star-jump←Star_Jump L2 [] r4 timed impact | rocket-jump←Rocket_Jump L3 [] r5 impact
arms:       dumbbell-curl←Dumbbell_Bicep_Curl L1 [dumbbell] r1 anim | tricep-kickback←Tricep_Dumbbell_Kickback L1 [dumbbell] r2 | hammer-curl←Hammer_Curls L1 [dumbbell] r3 | lying-tricep-extension←Lying_Dumbbell_Tricep_Extension L2 [dumbbell,mat] r4 | zottman-curl←Zottman_Curl L2 [dumbbell] r5 | bench-dips←Bench_Dips L2 [chair] r6 contra[shoulder] | standing-tricep-extension←Standing_Dumbbell_Triceps_Extension L2 [dumbbell] r7
shoulder_iso: lateral-raise←Side_Lateral_Raise L1 [dumbbell] r1 anim | front-raise←Front_Dumbbell_Raise L1 [dumbbell] r2 | reverse-flyes←Reverse_Flyes L2 [dumbbell] r3 | band-rear-delt-fly←Back_Flyes_-_With_Bands L1 [band] r4 | band-lateral-raise←Lateral_Raise_-_With_Bands L1 [band] r5 | dumbbell-shrug←Dumbbell_Shrug L1 [dumbbell] r6
```
Итого 81 запись. `anim` = slug, если помечено `anim`, иначе `null`. `impact` только где помечено. `timed` — удержания/кардио.

- [ ] **Step 2: Переводы** — `content-src/exercises.ru.json`: `{ "<slug>": { "name": "…", "cues": ["…","…","…"], "reviewed": false } }` для всех 81 slug. Имена: Приседания, Приседания с резинкой, Гоблет-присед с гантелью, Плие-присед с гантелью, Выпрыгивания из приседа; Ягодичный мост, Разгибание бедра с резинкой, Ягодичный мост на одной ноге, Румынская тяга с гантелями; Сплит-присед, Зашагивание с подъёмом колена, Выпады шагом, Сплит-присед с гантелями, Выпады с гантелями, Обратные выпады с гантелями, Зашагивания с гантелями; Отжимания от опоры, Отжимания, Жим гантелей лёжа на полу, Отжимания широким хватом, Отжимания узким хватом, Отжимания с ногами на опоре, Отжимания с переходом в боковую планку, Плио-отжимания; Жим резинки над головой, Жим гантелей стоя, Жим Арнольда, Жим одной гантели стоя; Разведение резинки, Тяга гантели одной рукой, Тяга двух гантелей в наклоне, Австралийские подтягивания; Пуловер с гантелью, Лопаточные подтягивания, Подтягивания; Мёртвый жук, Скручивания, Супермен, Планка, Обратные скручивания, Боковая планка, Русский твист, Скалолаз; Подъёмы на носки, Подъёмы на носки с резинкой, Подъёмы на носок на одной ноге, Подъёмы на носок сидя на одной ноге; Круги стопой, Растяжка икры у стены, Растяжка камбаловидной и ахилла, Растяжка сгибателей бедра с колена, Кошка, Поза ребёнка, Величайшая растяжка, Растяжка задней поверхности 90/90, Раскатка задней поверхности бедра, Раскатка квадрицепса, Растяжка плеч, Растяжка верха спины, Гусеница, Круги бёдрами, Динамическая растяжка груди, Наружная ротация с резинкой, Внутренняя ротация с резинкой; Быстрые зашагивания, Скалолаз (кардио), Скакалка, Звезда, Ракета; Сгибания с гантелями, Разгибание на трицепс в наклоне, Молотки, Французский жим лёжа, Сгибания Зоттмана, Обратные отжимания от стула, Разгибание на трицепс стоя; Махи в стороны, Махи перед собой, Разведения в наклоне, Разведение резинки на задние дельты, Махи с резинкой, Шраги с гантелями.
Cues — 2–3 коротких подсказки по технике на упражнение, переведённые и сокращённые из `instructions` базы (пример для push-up: «Ладони чуть шире плеч», «Тело — прямая линия, пресс напряжён», «Грудь почти касается пола»).

- [ ] **Step 3: Скрипт сборки** — `npm i -D zod` (sharp, tsx уже есть). `scripts/build-exercises.ts`:
  1. Скачать `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` в `content-src/.cache/` (gitignore), если нет.
  2. Прочитать curated и ru, валидировать zod-схемами (`slug` kebab-case, уникальный; `difficultyRank` уникален внутри `pattern`; у каждого slug есть перевод с непустыми `name` и ≥2 `cues`; `sourceId` существует в базе либо `null`).
  3. Для каждого sourceId скачать `exercises/<images[i]>` (2 кадра) в кэш, конвертировать `sharp().resize({ width: 600 }).webp({ quality: 75 })` → `public/exercises/<slug>/0.webp`, `1.webp` (пропускать, если файл уже есть).
  4. Собрать `Exercise[]` (primary/secondaryMuscles из базы, `images` = пути, `name/cues/reviewed` из ru) → `src/content/exercises.json` (отсортировано по slug).
  5. Напечатать отчёт: количество, пропущенные переводы, паттерны с <2 bodyweight-кандидатами.
  Run: `npm run content` → 81 запись, ~160 webp (у `jump-rope` нет фото).

- [ ] **Step 4: Экраны** — `ExercisesPage`: поиск по имени + фильтр-чипы по паттерну (`Tabs`/`Badge`), сетка `ExerciseCard` (превью `0.webp`, имя, бейджи мышц). `ExercisePage`: заголовок, `Tabs` «3D» (пока заглушка — Task 9 вставит `ExerciseFigure`) / «Фото» (два кадра рядом), список `cues`, бейджи `primaryMuscles` (перевод мышц — словарь `MUSCLE_RU` в `src/content/muscles.ts`), инвентарь, пометка «Ударная нагрузка» при `impact`.

- [ ] **Step 5: Проверить** `npm run build`, в dev: `/exercises` → карточки, клик → страница. Коммиты по шагам: `feat: curated exercise list`, `feat: russian exercise translations`, `feat: exercise content build script`, `feat: exercises catalog and detail screens`. Push → проверить картинки на Pages.

---

### Task 9: 3D-персонаж — процедурная фигура, позы, плеер

**Files:**
- Create: `src/features/exercises/figure/{bodyPresets.ts,pose.ts,pose.test.ts,Figure.tsx,usePosePlayer.ts,ExerciseFigure.tsx}`, `content-src/anims/<slug>.json` (копируются скриптом в `src/content/anims/`), `src/content/anims/index.ts`
- Modify: `scripts/build-exercises.ts` (копирование anims + валидация, что `anim` указывает на существующий файл), `ExercisePage.tsx` (вкладка «3D»), `ProfilePage.tsx` (переключатель фигуры — часть 2; здесь — локальный toggle на странице упражнения)

**Interfaces:**
- `pose.ts`:

```ts
export type Joint = "hips" | "spine" | "chest" | "neck" | "head"
  | "lShoulder" | "rShoulder" | "lElbow" | "rElbow" | "lWrist" | "rWrist"
  | "lHip" | "rHip" | "lKnee" | "rKnee" | "lAnkle" | "rAnkle"
export type Euler3 = [number, number, number]                 // градусы, порядок XYZ
export type Pose = Partial<Record<Joint, Euler3>> & { root?: { y?: number; rot?: Euler3 } }
export interface AnimKey { t: number; pose: Pose }              // t ∈ [0,1]
export interface Anim { slug: string; duration: number; loop: boolean; keys: AnimKey[] }
export const JOINTS: Joint[]
export function lerpPose(a: Pose, b: Pose, k: number): Pose   // покомпонентно, отсутствующий сустав = [0,0,0], root.y по умолчанию 0
export function samplePose(anim: Anim, timeS: number): Pose   // t = (timeS mod duration)/duration; ищет соседние ключи; smoothstep(k)
export function mirrorPose(p: Pose): Pose                     // l↔r, знаки y/z инвертированы (для unilateral)
```
- `bodyPresets.ts`: `export const BODY: Record<Sex, BodyPreset>`, где

```ts
export interface BodyPreset {
  headR: number; neckL: number; torsoL: number; shoulderW: number; hipW: number
  upperArmL: number; forearmL: number; handL: number; thighL: number; shinL: number; footL: number
  r: { arm: number; forearm: number; thigh: number; shin: number; torsoTop: number; torsoBottom: number }
  colors: { skin: string; top: string; bottom: string; shoes: string; hair: string }
}
```
male: headR .11, neckL .07, torsoL .55, shoulderW .42, hipW .30, upperArmL .30, forearmL .27, handL .10, thighL .45, shinL .43, footL .25, r {arm .055, forearm .045, thigh .085, shin .06, torsoTop .17, torsoBottom .14}, colors {skin "#d9a47a", top "#1f2937", bottom "#111827", shoes "#f4f4f5", hair "#2b1d12"}.
female: headR .10, neckL .065, torsoL .50, shoulderW .36, hipW .33, upperArmL .28, forearmL .25, handL .09, thighL .43, shinL .41, footL .23, r {arm .045, forearm .038, thigh .08, shin .052, torsoTop .145, torsoBottom .15}, colors {skin "#e3b08a", top "#a3e635", bottom "#1f2937", shoes "#f4f4f5", hair "#3b2a1a"}.
- `Figure.tsx`: `<Figure preset={BODY[sex]} pose={pose} />` — иерархия групп (см. ниже), капсулы `<capsuleGeometry args={[r, len, 4, 12]}/>`, `meshStandardMaterial`; стоит на y=0, смотрит в +Z.
- `usePosePlayer(anim: Anim | null, playing: boolean): Pose` — `useFrame` + `samplePose(anim, clock)`; без анимации — поза покоя.
- `ExerciseFigure.tsx`: `<ExerciseFigure slug figure="male"|"female" />` → `<Canvas camera={{ position: [1.8, 1.3, 2.6], fov: 40 }}>` + `ambientLight 0.6` + `directionalLight [3,5,2] 1.2` + drei `<ContactShadows/>` + `<OrbitControls enablePan={false} minPolarAngle={0.9} maxPolarAngle={1.6} target={[0,0.9,0]}/>` + `<Figure/>`; `anim` берётся из `ANIMS[slug]` (`src/content/anims/index.ts` — `import.meta.glob("./*.json", { eager: true })`). Кнопки: пауза, male/female (локальный state; часть 2 привяжет к профилю).

Иерархия `Figure` (локальные смещения; оси: Y вверх, Z вперёд; конечности в покое висят вниз, поэтому меш сегмента смещён на `-len/2` по Y относительно сустава):
```
root (y = thighL+shinL+0.05 + root.y, rotation root.rot)
└ hips (меш таз: capsule r=torsoBottom, len 0.08)
   ├ spine (y +0.12) → chest (y +0.2; меш торс capsule r=torsoTop len=torsoL-0.3, центр y +0.15)
   │   ├ neck (y +torsoL*0.55) → head (y +neckL; sphere headR; «волосы» — полусфера сверху)
   │   ├ lShoulder (x +shoulderW/2, y +torsoL*0.45) → [upperArm] → lElbow (y -upperArmL) → [forearm] → lWrist (y -forearmL) → [hand box]
   │   └ rShoulder (x -shoulderW/2 …) симметрично
   ├ lHip (x +hipW/2, y -0.02) → [thigh] → lKnee (y -thighL) → [shin] → lAnkle (y -shinL) → [foot box: z +footL/2-0.04, y -0.04]
   └ rHip симметрично
```
Знаки: сгибание бедра/плеча вперёд = +X; сгибание колена = −X; сгибание локтя = +X; отведение руки влево = −Z на `lShoulder`, вправо = +Z на `rShoulder`; наклон корпуса вперёд = +X на `spine`.

- [ ] **Step 1: Тесты `pose.test.ts`**

```ts
it("lerpPose interpolates and fills missing joints", () => {
  expect(lerpPose({ lKnee: [-20, 0, 0] }, { lKnee: [-100, 0, 0], lHip: [60, 0, 0] }, 0.5)).toEqual({ lKnee: [-60, 0, 0], lHip: [30, 0, 0], root: { y: 0, rot: [0, 0, 0] } })
})
it("samplePose loops and eases", () => {
  const anim = { slug: "x", duration: 2, loop: true, keys: [{ t: 0, pose: { lHip: [0, 0, 0] } }, { t: 0.5, pose: { lHip: [90, 0, 0] } }, { t: 1, pose: { lHip: [0, 0, 0] } }] }
  expect(samplePose(anim, 1).lHip![0]).toBe(90)       // середина цикла
  expect(samplePose(anim, 2).lHip![0]).toBe(0)        // полный цикл → старт
  expect(samplePose(anim, 0.5).lHip![0]).toBeCloseTo(45, 5)  // smoothstep(0.5) = 0.5
  expect(samplePose(anim, 0.25).lHip![0]).toBeLessThan(22.5)  // ease-in
})
it("mirrorPose swaps sides and flips y/z", () => {
  expect(mirrorPose({ lShoulder: [30, 10, -40] })).toEqual({ rShoulder: [30, -10, 40], root: { y: 0, rot: [0, 0, 0] } })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** реализовать `pose.ts` (JOINTS, lerpPose → commit, samplePose → commit, mirrorPose → commit). **Step 4: Run** → PASS.

- [ ] **Step 5: Figure.tsx** — `npm i three @react-three/fiber @react-three/drei && npm i -D @types/three`. Компонент `Segment({ r, len, color })` (капсула со смещением −len/2) и `JointGroup({ joint, pose, position, children })` (`rotation` из `pose[joint]` в радианах). Собрать иерархию по схеме. Проверить визуально в dev на `/exercises/push-up` с позой покоя: фигура стоит, пропорции человеческие, обе руки/ноги симметричны. Commit `feat: procedural 3d figure`.

- [ ] **Step 6: Плеер и обёртка** — `usePosePlayer`, `ExerciseFigure`, вкладка «3D» в `ExercisePage`. Commit `feat: exercise figure player with male/female presets`.

- [ ] **Step 7: Анимации** — файлы `content-src/anims/<slug>.json` для 20 slug с `anim`: bodyweight-squat, dumbbell-squat, glute-bridge, single-leg-glute-bridge, dumbbell-rdl, split-squat, dumbbell-lunge, incline-push-up, push-up, dumbbell-floor-press, dumbbell-shoulder-press, band-pull-apart, one-arm-dumbbell-row, bent-over-dumbbell-row, dead-bug, plank, side-plank, standing-calf-raise, single-leg-calf-raise, jump-rope, dumbbell-curl, lateral-raise.
Эталон — `bodyweight-squat.json`:

```json
{ "slug": "bodyweight-squat", "duration": 2.6, "loop": true, "keys": [
  { "t": 0,   "pose": { "lShoulder": [20,0,0], "rShoulder": [20,0,0] } },
  { "t": 0.5, "pose": { "root": { "y": -0.32 }, "spine": [25,0,0], "lHip": [95,0,-8], "rHip": [95,0,8], "lKnee": [-105,0,0], "rKnee": [-105,0,0], "lAnkle": [25,0,0], "rAnkle": [25,0,0], "lShoulder": [85,0,0], "rShoulder": [85,0,0] } },
  { "t": 1,   "pose": { "lShoulder": [20,0,0], "rShoulder": [20,0,0] } } ] }
```
`push-up.json` (лёжа лицом вниз: `root.rot = [90,0,0]`, высота корня подбирается так, чтобы ладони касались пола):
```json
{ "slug": "push-up", "duration": 2.2, "loop": true, "keys": [
  { "t": 0,   "pose": { "root": { "y": -0.72, "rot": [82,0,0] }, "lShoulder": [95,0,-10], "rShoulder": [95,0,10], "lElbow": [0,0,0], "rElbow": [0,0,0], "lAnkle": [-60,0,0], "rAnkle": [-60,0,0], "neck": [-30,0,0] } },
  { "t": 0.5, "pose": { "root": { "y": -0.92, "rot": [82,0,0] }, "lShoulder": [120,0,-35], "rShoulder": [120,0,35], "lElbow": [95,0,0], "rElbow": [95,0,0], "lAnkle": [-60,0,0], "rAnkle": [-60,0,0], "neck": [-30,0,0] } },
  { "t": 1,   "pose": { "root": { "y": -0.72, "rot": [82,0,0] }, "lShoulder": [95,0,-10], "rShoulder": [95,0,10], "lAnkle": [-60,0,0], "rAnkle": [-60,0,0], "neck": [-30,0,0] } } ] }
```
Остальные — по тому же принципу, 3 ключа (старт → пик → старт), ключевые углы: glute-bridge (лёжа на спине `rot [-90,0,0]`, колени −90, в пике бёдра разгибаются до 0 и корень поднимается на +0.18); dead-bug (лёжа на спине, попеременно противоположные рука/нога — 5 ключей, `mirrorPose` для второй половины); plank (статичная поза, 2 ключа с лёгким дыханием ±0.01 root.y); side-plank (`rot [0,0,-90]`...); calf raises (root.y +0.07, ankles −25); lunge (шаг: lHip +30/rHip −20, колени −90, root.y −0.25); rdl (spine +10, hips +80, knees −15, shoulders +80 к земле); shoulder press (руки от 90 над головой до 180); pull-apart (руки вперёд 90, отведение до ±60); row (наклон 45, локоть 0 → −100); curl (elbow 0 → 130); lateral raise (abduction 0 → 85); jump-rope (root.y 0 → +0.08, ankles, лёгкое вращение предплечий 3 ключа, duration 0.5).
Каждую анимацию проверять скриншотом (Playwright, `_screens/anim-<slug>.png`, удалить в конце) и править углы, пока поза читается однозначно. Коммит после каждых 4–5 анимаций: `feat: 3d animations for <группа>`.

- [ ] **Step 8:** `npm run content` копирует anims, валидирует ссылки; `npm run build`; push. Проверить на Pages производительность на телефоне (Артём): кадр ≥30 fps — иначе снизить сегменты капсул до `[r, len, 2, 8]`.

---

### Task 10: Расчёты питания и тела (`lib/calc`, TDD)

**Files:**
- Create: `src/lib/calc/{bmr,tdee,targets,navyBodyFat,bmi,rolling}.ts`, `src/lib/calc/calc.test.ts`, `src/lib/calc/index.ts`

**Interfaces:**
```ts
bmr({ sex, weightKg, heightCm, age }): number                 // Mifflin-St Jeor, округление до целого
tdee(bmr: number, activity: ActivityLevel, trainingDays: number): number   // ×1.2/1.375/1.55/1.725 + trainingDays*250/7
targets({ tdee, goal, weightKg }): { kcal, protein_g, fat_g, carbs_g }    // fat ×0.82, muscle ×1.08, tone ×1; белок 2.0/1.8/1.6 г/кг; жиры 0.9 г/кг; углеводы остаток, min 50
navyBodyFat({ sex, heightCm, waistCm, neckCm, hipCm? }): number | null   // null, если для female нет hipCm или аргумент log ≤ 0
bmi(weightKg, heightCm): number                                // 1 знак
rollingMean(points: { date: string; value: number }[], windowDays = 7): { date: string; value: number }[]  // среднее по точкам за предыдущие windowDays включительно
```

- [ ] **Step 1: Тесты**

```ts
it("bmr", () => { expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, age: 35 })).toBe(1755); expect(bmr({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBe(1320) })
it("tdee adds training days", () => expect(tdee(1755, "light", 3)).toBe(2520))
it("targets fat", () => expect(targets({ tdee: 2520, goal: "fat", weightKg: 80 })).toEqual({ kcal: 2066, protein_g: 160, fat_g: 72, carbs_g: 194 }))
it("navy male ≈ 18.4", () => expect(navyBodyFat({ sex: "male", heightCm: 180, waistCm: 90, neckCm: 40 })).toBeCloseTo(18.4, 1))
it("navy female needs hip", () => expect(navyBodyFat({ sex: "female", heightCm: 165, waistCm: 70, neckCm: 32 })).toBeNull())
it("bmi", () => expect(bmi(80, 180)).toBe(24.7))
it("rollingMean", () => expect(rollingMean([{ date: "2026-10-01", value: 80 }, { date: "2026-10-03", value: 82 }, { date: "2026-10-10", value: 78 }])).toEqual([{ date: "2026-10-01", value: 80 }, { date: "2026-10-03", value: 81 }, { date: "2026-10-10", value: 78 }]))
```

- [ ] **Step 2: Run** → FAIL. **Step 3:** по одной функции на файл с коммитом каждая (`feat: bmr`, …). **Step 4: Run** → PASS.

---

### Task 11: Движок — типы, seed, ограничения, пул, шаблоны, расписание

**Files:**
- Create: `src/features/program/engine/{types,seed,restrictions,pool,templates,schedule}.ts` + `restrictions.test.ts`, `pool.test.ts`, `templates.test.ts`, `schedule.test.ts`, `seed.test.ts`, `fixtures/owner.ts`

**Interfaces:**
```ts
// types.ts
import type { Exercise, Pattern } from "@/content/types"
import type { Experience, Goal, InjuryTag, Profile, TestRow } from "@/lib/schema"
export type ProfileInput = Pick<Profile, "sex" | "birth_year" | "goal" | "experience" | "days_per_week" | "session_min" | "injuries" | "equipment">
export type TestInput = TestRow["results"] & { date: string }
export interface Restrictions { noImpact: boolean; ankleRehab: boolean; exclude: InjuryTag[] }
export type Pool = Record<Pattern, Exercise[]>
export type Block = "warmup" | "main" | "finisher" | "cooldown"
export type DayType = "A" | "B" | "U" | "L"
export interface PlannedExercise { slug: string; block: Block; sets: number; reps?: [number, number]; durationS?: number; targetRir: number; loadKg?: number; restS: number; note?: string }
export interface Slot { pattern: Pattern; fallback?: Pattern; sets: number }
export interface DayTemplate { dayType: DayType; slots: Slot[] }
export interface Template { kind: "fullbody" | "upperlower"; days: DayTemplate[] }
export interface SessionPlan { id: string; date: string; week: 1 | 2 | 3 | 4; dayType: DayType; exercises: PlannedExercise[]; estMin: number }
export interface ProgramConfig { profile: ProfileInput; baseline: TestInput; latestTest: TestInput; startDate: string; seed: string; generatorVersion: 1 }
export interface SetLog { slug: string; setNo: number; reps?: number; durationS?: number; weightKg?: number; rir?: number }
export interface SessionLog { date: string; dayType?: DayType; preSoreness?: number; preSleep?: number; preEnergy?: number; rpe?: number; sets: SetLog[] }
export interface CheckIn { soreness: number; sleep: number; energy: number }
export const DUMBBELL_KG = 10
// seed.ts
export function hashString(s: string): number            // FNV-1a 32 бит
export function mulberry32(seed: number): () => number    // [0,1)
export function hashToUuid(s: string): string             // 32 hex из двух хэшей → формат 8-4-4-4-12
// restrictions.ts
export const ANKLE_CRITERIA = { kneeToWallDiffCm: 1, singleLegCalfRaises: 25, balanceEyesClosedS: 30 }
export function ankleCleared(t?: AnkleTest): boolean
export function deriveRestrictions(profile: ProfileInput, latestTest?: TestInput): Restrictions
// pool.ts
export const ALWAYS_AVAILABLE: EquipmentTag[] = ["chair", "wall"]
export const LEVEL_CAP: Record<Experience, 1 | 2 | 3> = { none: 2, some: 3, regular: 3 }
export function buildPool(exercises: Exercise[], profile: ProfileInput, r: Restrictions): Pool   // отсортировано по difficultyRank
// templates.ts
export function getTemplate(days: 2 | 3 | 4): Template
//  fullbody A: squat3 push_h3 pull_h3 core2 ; B: hinge3 push_v2 pull_v2(fallback pull_h) lunge2 calf2
//  upperlower U: push_h3 pull_h3 push_v2 pull_v2(fallback pull_h) arms1 ; L: squat3 hinge3 lunge2 calf2 core2
export function dayTypeFor(tpl: Template, sessionIndex: number): DayType   // tpl.days[i % days.length]
// schedule.ts
export const WEEKDAYS: Record<2 | 3 | 4, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] }
export function sessionDates(startDate: string, days: 2 | 3 | 4, weeks = 4): { date: string; week: 1 | 2 | 3 | 4 }[]
```
`sessionDates`: неделя 1 начинается с понедельника недели `startDate`; если в этой неделе нет тренировочного дня ≥ `startDate`, старт сдвигается на следующий понедельник; даты < `startDate` отбрасываются.

- [ ] **Step 1: Фикстура владельца** `fixtures/owner.ts`:

```ts
export const ownerProfile: ProfileInput = { sex: "male", birth_year: 1990, goal: "fat", experience: "some", days_per_week: 3, session_min: 30, injuries: ["ankle"], equipment: ["dumbbell", "band", "mat", "rope", "roller", "ball", "chair", "wall"] }
export const ownerBaseline: TestInput = { date: "2026-10-10", pushups: 12, squats: 25, plank_s: 40, ankle: { knee_to_wall_diff_cm: 2.5, single_leg_calf_raises: 12, balance_eyes_closed_s: 15 } }
export const ownerConfig: ProgramConfig = { profile: ownerProfile, baseline: ownerBaseline, latestTest: ownerBaseline, startDate: "2026-10-10", seed: "owner-1", generatorVersion: 1 }
export const clearedAnkle = { knee_to_wall_diff_cm: 0.5, single_leg_calf_raises: 26, balance_eyes_closed_s: 30 }
```
Год рождения, рост — заглушки до онбординга.

- [ ] **Step 2: Тесты**

```ts
// restrictions.test.ts
it("ankle not cleared → noImpact", () => expect(deriveRestrictions(ownerProfile, ownerBaseline)).toEqual({ noImpact: true, ankleRehab: true, exclude: ["ankle"] }))
it("3/3 criteria → cleared; 2/3 → not", () => {
  expect(ankleCleared(clearedAnkle)).toBe(true)
  expect(ankleCleared({ ...clearedAnkle, single_leg_calf_raises: 24 })).toBe(false)
  expect(deriveRestrictions(ownerProfile, { ...ownerBaseline, ankle: clearedAnkle }).noImpact).toBe(false)
})
it("no test yet → impact locked only if ankle injury", () => {
  expect(deriveRestrictions(ownerProfile).noImpact).toBe(true)
  expect(deriveRestrictions({ ...ownerProfile, injuries: [] }).noImpact).toBe(false)
})
// pool.test.ts (exercises из src/content/exercises.json)
it("home equipment: no bar exercises, every main pattern has candidates", () => {
  const pool = buildPool(exercises, ownerProfile, deriveRestrictions(ownerProfile, ownerBaseline))
  expect(pool.pull_v.map(e => e.slug)).toEqual(["dumbbell-pullover"])
  for (const p of ["squat", "hinge", "lunge", "push_h", "push_v", "pull_h", "core", "calf"] as const) expect(pool[p].length).toBeGreaterThan(0)
  expect(Object.values(pool).flat().some(e => e.impact)).toBe(false)
  expect(pool.hinge.map(e => e.difficultyRank)).toEqual([...pool.hinge.map(e => e.difficultyRank)].sort((a, b) => a - b))
})
it("bodyweight-only profile still fills every main pattern", () => {
  const pool = buildPool(exercises, { ...ownerProfile, equipment: ["mat"] }, deriveRestrictions(ownerProfile, ownerBaseline))
  for (const p of ["squat", "hinge", "lunge", "push_h", "pull_h", "core", "calf"] as const) expect(pool[p].length).toBeGreaterThan(0)
})
it("contraindications exclude", () => {
  const pool = buildPool(exercises, { ...ownerProfile, injuries: ["ankle", "lower_back"] }, { noImpact: true, ankleRehab: true, exclude: ["ankle", "lower_back"] })
  expect(pool.hinge.find(e => e.slug === "dumbbell-rdl")).toBeUndefined()
})
// templates.test.ts
it("2–3 days alternate A/B, 4 days U/L", () => {
  expect([0, 1, 2, 3, 4, 5].map(i => dayTypeFor(getTemplate(3), i))).toEqual(["A", "B", "A", "B", "A", "B"])
  expect([0, 1, 2, 3].map(i => dayTypeFor(getTemplate(4), i))).toEqual(["U", "L", "U", "L"])
})
// schedule.test.ts
it("saturday start, 3 days → first Monday, 12 sessions", () => {
  const d = sessionDates("2026-10-10", 3); expect(d[0]).toEqual({ date: "2026-10-12", week: 1 }); expect(d).toHaveLength(12); expect(d.at(-1)!.date).toBe("2026-11-06")
})
it("tuesday start keeps current week", () => { const d = sessionDates("2026-10-13", 3); expect(d[0].date).toBe("2026-10-14"); expect(d).toHaveLength(11) })
// seed.test.ts
it("deterministic", () => { const a = mulberry32(hashString("x")), b = mulberry32(hashString("x")); expect(a()).toBe(b()); expect(hashToUuid("p:2026-10-12")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) })
```

- [ ] **Step 3: Run** → FAIL; реализовать по файлу (каждый ≤150 строк) с коммитом: `feat(engine): types and seeded rng`, `feat(engine): restrictions`, `feat(engine): exercise pool`, `feat(engine): templates`, `feat(engine): schedule`. **Step 4: Run** → PASS.

---

### Task 12: Движок — baseline, периодизация, прогрессия, авторегуляция, разминка, цели, generateBlock

**Files:**
- Create: `src/features/program/engine/{baseline,periodization,progression,autoregulate,warmup,goals,estimate,generateBlock}.ts` + тесты `generateBlock.test.ts`, `progression.test.ts`, `autoregulate.test.ts`, `periodization.test.ts`, `baseline.test.ts`; `src/features/program/engine/index.ts` (реэкспорт)

**Interfaces:**
```ts
// baseline.ts
export function startRank(pattern: Pattern, test: TestInput): number   // push_h: pushups <5→1, 5–14→2, ≥15→3; squat: squats <15→1, 15–29→2, ≥30→3; core: plank_s <20→1, 20–59→4, ≥60→6; иначе 1
export function startReps(pattern: Pattern, test: TestInput): [number, number]  // push_h и pushups<5 → [5,8]; иначе [8,12]
export function startDuration(test: TestInput): number                 // plank: clamp(round(plank_s*0.6/5)*5, 15, 60); прочие timed — 30
export function pickExercise(candidates: Exercise[], minRank: number, rng: () => number): Exercise | undefined  // среди ранга ≥ minRank берёт один из первых двух (rng); если нет — последний доступный
// periodization.ts
export function weekParams(week: 1 | 2 | 3 | 4, blockIndex: number): { rir: [number, number]; setScale: number }
//  block 0: w1,w2 → [4,5]×1; w3 → [3,3]×1; w4 → [4,5]×0.6 ; block ≥1: w1 → [3,3]; w2,w3 → [2,3]; w4 → [4,5]×0.6
export function setCap(blockIndex: number, goal: Goal): number   // block 0 → 8; далее muscle 14, иначе 12
export function capSets(exs: PlannedExercise[], cap: number): PlannedExercise[]   // только block "main": срезает по 1 сету с конца по кругу до cap, минимум 1
// progression.ts
export function hitTop(sets: SetLog[], ex: PlannedExercise): boolean   // все сеты reps ≥ reps[1] (или durationS ≥ цели)
export function progressExercise(prev: PlannedExercise, lastTwo: SetLog[][], pattern: Exercise[], current: Exercise): PlannedExercise
//  оба раза hitTop → timed: durationS+5 (≤90) ; иначе следующий по рангу в pattern (slug меняется, reps → [8,12]) ; нет следующего → sets+1 (≤5) ; иначе → без изменений. loadKg никогда > DUMBBELL_KG
// autoregulate.ts
export function autoregulate(s: SessionPlan, c: CheckIn): SessionPlan   // soreness ≥4 || sleep ≤2 || energy ≤2 → main: sets−1 (≥1), targetRir+1, note "Облегчено по самочувствию"
// warmup.ts
export function buildWarmup(r: Restrictions, dayType: DayType, pool: Pool): PlannedExercise[]
//  база: cat-stretch 30s, standing-hip-circles 30s, worlds-greatest-stretch 1×6 ; A/L: + bodyweight-squat 1×10 ; B/U: + band-pull-apart 1×12 либо dynamic-chest-stretch 30s
//  ankleRehab → в начало: ankle-circles 30s, calf-stretch-wall 30s, standing-calf-raise 1×12 (все block "warmup", restS 0, targetRir 5)
// goals.ts
export function applyGoal(goal: Goal, exs: PlannedExercise[], r: Restrictions, pool: Pool, blockIndex: number, rng: () => number): PlannedExercise[]
//  fat: blockIndex ≥1 → finisher из pool.cardio (без impact при noImpact) 1×240s ; muscle: blockIndex ≥1 → +arms 2 сета, targetRir −1 (≥1) ; tone: cooldown — 1 mobility 45s
// estimate.ts
export function estimateMinutes(exs: PlannedExercise[]): number   // Σ sets × ((reps ? avg×3s : durationS) + restS) / 60, округление вверх
// generateBlock.ts
export function generateBlock(cfg: ProgramConfig, exercises: Exercise[], history: SessionLog[], blockIndex: number, programId: string): SessionPlan[]
```
`generateBlock`: `r → pool → tpl → dates(startDate + 28·blockIndex) → rng = mulberry32(hashString(seed + ":" + blockIndex))`; на каждый `dayType` один раз выбирает упражнения по слотам (`pickExercise(pool[slot.pattern] ?? fallback)`, note «Замена: нет инвентаря» при fallback), строит `PlannedExercise` (sets из слота, reps/duration из baseline, loadKg = 10 для `equipment ⊇ dumbbell`, restS 60 / 30 для timed), применяет `progressExercise` по `history` (последние 2 сессии с этим slug), затем для каждой сессии: `weekParams` → `targetRir = rir[0]`, `sets = ceil(sets×setScale)`, `capSets`, `applyGoal`, `buildWarmup` впереди; пока `estimateMinutes > session_min` — срезать по 1 main-сету по кругу (минимум 1); `id = hashToUuid(programId + ":" + date)`.

- [ ] **Step 1: Тесты** (ключевые; `exercises` из `@/content/exercises.json`)

```ts
const block = generateBlock(ownerConfig, exercises, [], 0, "prog-1")
it("1: no impact anywhere while ankle locked, including finisher in block 1", () => {
  const all = [block, generateBlock(ownerConfig, exercises, [], 1, "prog-1")].flat().flatMap(s => s.exercises)
  expect(all.some(e => bySlug.get(e.slug)!.impact)).toBe(false)
  expect(generateBlock(ownerConfig, exercises, [], 1, "prog-1")[0].exercises.some(e => e.block === "finisher")).toBe(true)
})
it("3: weeks 1–2 RIR 4–5, deload week ≤60% sets", () => {
  for (const s of block.filter(s => s.week <= 2)) for (const e of s.exercises.filter(e => e.block === "main")) expect(e.targetRir).toBeGreaterThanOrEqual(4)
  const sets = (w: number) => block.filter(s => s.week === w).reduce((n, s) => n + s.exercises.filter(e => e.block === "main").reduce((m, e) => m + e.sets, 0), 0)
  expect(sets(4)).toBeLessThanOrEqual(Math.ceil(sets(3) * 0.6) + 1)
})
it("block 1: ≤8 main sets per session, no finisher, fits 30 min", () => {
  for (const s of block) { expect(s.exercises.filter(e => e.block === "main").reduce((n, e) => n + e.sets, 0)).toBeLessThanOrEqual(8); expect(s.exercises.some(e => e.block === "finisher")).toBe(false); expect(s.estMin).toBeLessThanOrEqual(30) }
})
it("4/5: double progression → next variation, never >10 kg", () => {
  const prev: PlannedExercise = { slug: "dumbbell-squat", block: "main", sets: 3, reps: [8, 12], targetRir: 3, loadKg: 10, restS: 60 }
  const top = [1, 2, 3].map(n => ({ slug: "dumbbell-squat", setNo: n, reps: 12, weightKg: 10 }))
  const next = progressExercise(prev, [top, top], pool.squat, bySlug.get("dumbbell-squat")!)
  expect(next.slug).toBe("plie-dumbbell-squat"); expect(next.reps).toEqual([8, 12]); expect(next.loadKg ?? 0).toBeLessThanOrEqual(10)
  expect(progressExercise(prev, [top], pool.squat, bySlug.get("dumbbell-squat")!)).toEqual(prev)
})
it("6: no bar → pull_v slot substituted with note", () => {
  const b = block.find(s => s.dayType === "B")!
  expect(b.exercises.some(e => e.note?.startsWith("Замена"))).toBe(true)
})
it("7: A-B-A pattern and dates", () => expect(block.slice(0, 3).map(s => s.dayType)).toEqual(["A", "B", "A"]))
it("8: autoregulation", () => {
  const eased = autoregulate(block[0], { soreness: 4, sleep: 3, energy: 3 })
  for (const [i, e] of eased.exercises.entries()) if (e.block === "main") { expect(e.sets).toBe(Math.max(1, block[0].exercises[i].sets - 1)); expect(e.targetRir).toBe(block[0].exercises[i].targetRir + 1) }
  expect(autoregulate(block[0], { soreness: 2, sleep: 4, energy: 4 })).toEqual(block[0])
})
it("9: deterministic by seed, different seed → different picks", () => {
  expect(generateBlock(ownerConfig, exercises, [], 0, "prog-1")).toEqual(block)
  const other = generateBlock({ ...ownerConfig, seed: "owner-2" }, exercises, [], 0, "prog-1")
  expect(other.map(s => s.exercises.map(e => e.slug)).flat()).not.toEqual(block.map(s => s.exercises.map(e => e.slug)).flat())
  expect(other[0].exercises.filter(e => e.block === "main").map(e => bySlug.get(e.slug)!.pattern)).toEqual(block[0].exercises.filter(e => e.block === "main").map(e => bySlug.get(e.slug)!.pattern))
})
it("10: push-up variant from test; ankle warm-up present", () => {
  const weak = generateBlock({ ...ownerConfig, baseline: { ...ownerBaseline, pushups: 3 }, latestTest: { ...ownerBaseline, pushups: 3 } }, exercises, [], 0, "p")
  expect(weak[0].exercises.find(e => bySlug.get(e.slug)!.pattern === "push_h")!.slug).toBe("incline-push-up")
  const strong = generateBlock({ ...ownerConfig, baseline: { ...ownerBaseline, pushups: 25 }, latestTest: { ...ownerBaseline, pushups: 25 } }, exercises, [], 0, "p")
  expect(["push-up", "dumbbell-floor-press", "wide-push-up"]).toContain(strong[0].exercises.find(e => bySlug.get(e.slug)!.pattern === "push_h")!.slug)
  expect(block[0].exercises.slice(0, 3).map(e => e.slug)).toEqual(["ankle-circles", "calf-stretch-wall", "standing-calf-raise"])
})
```

- [ ] **Step 2: Run** → FAIL; реализовать по файлу с коммитами: `feat(engine): baseline`, `feat(engine): periodization`, `feat(engine): progression`, `feat(engine): autoregulation`, `feat(engine): warmup`, `feat(engine): goal modifiers`, `feat(engine): generateBlock`. **Step 3: Run** → PASS; `npm run build`.

---

### Task 13: Dev-превью «золотого» плана

**Files:**
- Create: `src/app/pages/DevPreviewPage.tsx`; Modify: `src/app/router.tsx` (`dev/preview`)

- [ ] **Step 1:** страница вызывает `generateBlock(ownerConfig, exercises, [], 0, "preview")` и рендерит по сессии карточку: дата, день, `estMin`, таблица упражнений (имя из `bySlug`, блок, сеты×повторы/секунды, RIR, нагрузка, note). Переключатель «блок 0 / блок 1» и «нога разблокирована» (подменяет `latestTest.ankle` на `clearedAnkle`).
- [ ] **Step 2:** `npm run build`; скриншот десктопа по правилу CLAUDE.md в `_screens/` для проверки читаемости, удалить после. Commit `feat: dev preview of generated program`. Push.

---

## Self-Review

- **Spec coverage:** стек/деплой — T1–T3; auth OTP — T6; данные/RLS/uuid/user_id — T5, T7; keep-alive — T7; контент + переводы + валидация — T8; 3D male/female + позы — T9; питание (расчёты) — T10; движок + 10 тестов спецификации — T11–T12 (тесты 1–10 сопоставлены); dev-превью — T13. Экраны онбординга/тренировки/календаря/аналитики/чекпоинтов/питания и экспорт JSON — часть 2 (по плану спецификации).
- **Placeholder scan:** `pickExercise` при пустом списке возвращает `undefined` → `generateBlock` использует `fallback`, затем пропускает слот с `note`; `instructions`-переводы cues — ручная работа в T8 Step 2 с заданным форматом. Полный SQL в T7 описан по `schema.ts` — писать все 8 таблиц, не три.
- **Type consistency:** `Exercise.equipment: EquipmentTag[]`, `Profile.equipment: EquipmentTag[]` — один тип; `TestRow.results` ↔ `TestInput`; `PlannedSession.exercises: unknown[]` в schema хранит `PlannedExercise[]` движка (часть 2 добавит каст при чтении); `dayType` `"A"|"B"|"U"|"L"` совпадает в schema и engine.
- **Review Focus → тесты:** 1 → T6 `email.test.ts`; 2 → T3 прекэш JSON + T5 пустой стор (`replaceAll(emptyRows())`); 3 → T11 `restrictions.test.ts` («no test yet»); 4 → T11 `pool.test.ts` («bodyweight-only»); 5 → T5 `db.test.ts` («queues once»).

## Execution

Метод: **Native** (superpowers:executing-plans) — Артём отсутствует и дал автономный режим; задачи тесно связаны интерфейсами, одна сессия быстрее и дешевле. По завершении части 1 — независимое ревью ветки одним свежим агентом перед частью 2.
