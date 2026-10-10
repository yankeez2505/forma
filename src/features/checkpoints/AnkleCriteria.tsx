import { Circle, CircleCheck } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnkleTest } from "@/lib/schema"
import { ankleStatus } from "./checkpoint"

/** live view of the three impact-unlock criteria while the test is being typed */
export function AnkleCriteria({ ankle }: { ankle: Partial<AnkleTest> | undefined }) {
  const { cleared, criteria } = ankleStatus(ankle)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Разблокировка прыжков и скакалки</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3">
          {criteria.map((c) => {
            const Icon = c.ok ? CircleCheck : Circle
            return (
              <li key={c.key} className="flex items-center gap-3 text-sm">
                <Icon className={c.ok ? "size-5 shrink-0 text-primary" : "size-5 shrink-0 text-muted-foreground"} aria-hidden />
                <span className="flex-1">{c.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {c.value ?? "—"} / {c.op}{c.target}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
      <CardFooter className={cleared ? "text-sm text-primary" : "text-sm text-muted-foreground"}>
        {cleared ? "Все критерии пройдены — ударная нагрузка разрешена" : "Пока без прыжков: программа соберётся без ударной нагрузки"}
      </CardFooter>
    </Card>
  )
}
