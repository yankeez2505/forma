import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { CATEGORY_ORDER, CATEGORY_RU, foodById, type Menu } from "./foods"
import { shoppingList, type ShoppingLine } from "./nutrition"

const amount = (l: ShoppingLine) => {
  const g = l.grams >= 1000 ? `${(l.grams / 1000).toFixed(1)} кг` : `${l.grams} г`
  return l.units && l.food.unit ? `${g} (${l.units} ${l.food.unit.name})` : g
}
const lineText = (l: ShoppingLine) => `${l.food.name} — ${amount(l)}`

/** the week's shopping list grouped by category, copyable as plain text */
export function ShoppingSheet({ menu, open, onOpenChange }: { menu: Menu; open: boolean; onOpenChange: (open: boolean) => void }) {
  const list = shoppingList(menu, foodById)
  const groups = CATEGORY_ORDER.map((category) => ({ category, lines: list.filter((l) => l.food.category === category) })).filter((g) => g.lines.length > 0)
  const copy = () => {
    const text = groups.map((g) => [CATEGORY_RU[g.category], ...g.lines.map(lineText)].join("\n")).join("\n\n")
    navigator.clipboard.writeText(text).then(
      () => toast.success("Скопировано"),
      () => toast.error("Не удалось скопировать"),
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Список покупок на неделю</DrawerTitle>
          <DrawerDescription>{menu.title} · {list.length} продуктов</DrawerDescription>
        </DrawerHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 pb-6">
          {groups.map((g) => (
            <section key={g.category}>
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">{CATEGORY_RU[g.category]}</h3>
              <ul className="divide-y text-sm">
                {g.lines.map((l) => (
                  <li key={l.food.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0">{l.food.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{amount(l)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Button variant="outline" onClick={copy}>
            <Copy /> Скопировать
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
