import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  hint?: string
}
type Columns = 1 | 2 | 3
const COLS: Record<Columns, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }
const card = (active: boolean) =>
  cn("w-full rounded-lg border p-3 text-left transition-colors", active ? "border-primary bg-primary/5" : "hover:bg-accent")

const Text = ({ label, hint }: { label: string; hint?: string }) => (
  <span className="block">
    <span className="block font-medium">{label}</span>
    {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
  </span>
)

/** single choice as card buttons */
export function ChoiceGroup<T extends string>({
  value, onChange, options, columns = 1,
}: { value?: T; onChange: (v: T) => void; options: ChoiceOption<T>[]; columns?: Columns }) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", COLS[columns])}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={card(o.value === value)} onClick={() => onChange(o.value)}>
          <Text label={o.label} hint={o.hint} />
        </button>
      ))}
    </div>
  )
}

/** multiple choice as checkbox cards */
export function MultiChoice<T extends string>({
  value, onChange, options, columns = 2,
}: { value: T[]; onChange: (v: T[]) => void; options: ChoiceOption<T>[]; columns?: Columns }) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div role="group" className={cn("grid gap-2", COLS[columns])}>
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button key={o.value} type="button" role="checkbox" aria-checked={on} className={cn(card(on), "flex items-start justify-between gap-2")} onClick={() => toggle(o.value)}>
            <Text label={o.label} hint={o.hint} />
            {on && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
