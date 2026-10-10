import { ClipboardList, Scale, ShoppingCart } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Disclaimer } from "@/components/Disclaimer"
import { EmptyState } from "@/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GOAL_RU } from "@/content/labels"
import { latestValue } from "@/features/analytics/stats"
import { fmtDate, WEEKDAY_RU } from "@/features/program/format"
import { todayISO, weekday } from "@/lib/dates"
import { useDb } from "@/lib/db"
import { MenuDayView } from "./MenuDayView"
import { GOAL_NOTE_RU, menuFor, needsNewTarget, nutritionFor, scaleMenu, targetRow } from "./nutrition"
import { ShoppingSheet } from "./ShoppingSheet"

/** daily kcal/macro target from the profile and latest weight, the goal's week menu scaled to it, shopping list */
export default function NutritionPage() {
  const rows = useDb((s) => s.rows)
  const userId = useDb((s) => s.userId)
  const upsert = useDb((s) => s.upsert)
  const [shopping, setShopping] = useState(false)
  const profile = rows.profiles[userId]
  const today = todayISO()
  const weight = latestValue(rows, "weight_kg")
  const t = useMemo(() => (profile ? nutritionFor(profile, weight?.value, today) : null), [profile, weight?.value, today])
  const menu = useMemo(() => (profile && t ? scaleMenu(menuFor(profile.goal), t.kcal) : null), [profile, t])
  useEffect(() => {
    if (t && needsNewTarget(rows, t)) upsert("nutrition_targets", targetRow(userId, today, t))
  }, [rows, t, upsert, userId, today])
  if (!profile) {
    return <EmptyState icon={ClipboardList} title="Сначала анкета" action={<Button asChild><Link to="/onboarding">Заполнить</Link></Button>} />
  }
  if (!t || !menu || !weight) {
    return (
      <EmptyState
        icon={Scale}
        title="Нужен вес"
        text="Добавь замер веса — от него считаются калории и белок"
        action={<Button asChild><Link to="/progress">К замерам</Link></Button>}
      />
    )
  }
  return (
    <section className="grid gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Питание</h1>
      <Card>
        <CardHeader>
          <CardDescription>Цель на день</CardDescription>
          <CardTitle className="text-4xl tabular-nums">
            {t.kcal} <span className="text-base font-normal text-muted-foreground">ккал</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Б {t.protein_g} г</Badge>
            <Badge variant="secondary">Ж {t.fat_g} г</Badge>
            <Badge variant="secondary">У {t.carbs_g} г</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {GOAL_RU[profile.goal]} · {GOAL_NOTE_RU[profile.goal]} · вес {weight.value} кг от {fmtDate(weight.date)}
          </p>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Меню на неделю</h2>
        <Button variant="outline" size="sm" onClick={() => setShopping(true)}>
          <ShoppingCart /> Список покупок
        </Button>
      </div>
      <Tabs defaultValue={String(weekday(today))}>
        <TabsList className="grid w-full grid-cols-7">
          {WEEKDAY_RU.map((d, i) => (
            <TabsTrigger key={d} value={String(i)}>{d}</TabsTrigger>
          ))}
        </TabsList>
        {menu.days.map((day, i) => (
          <TabsContent key={i} value={String(i)}>
            <MenuDayView day={day} target={t} />
          </TabsContent>
        ))}
      </Tabs>
      <p className="text-sm text-muted-foreground">Шаблон из продуктов, доступных в Беларуси. Замены внутри категории (минтай → хек, гречка → перловка) цель не меняют</p>
      <Disclaimer />
      <ShoppingSheet menu={menu} open={shopping} onOpenChange={setShopping} />
    </section>
  )
}
