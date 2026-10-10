import { useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PATTERN_RU } from "@/content/labels"
import type { Pattern } from "@/content/types"
import { ExerciseCard } from "./ExerciseCard"
import { filterExercises, useExercises } from "./useExercises"

const PATTERNS = Object.keys(PATTERN_RU) as Pattern[]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Badge asChild variant={active ? "default" : "outline"}>
      <button type="button" aria-pressed={active} onClick={onClick} className="h-7 shrink-0 cursor-pointer px-3 text-sm">
        {children}
      </button>
    </Badge>
  )
}

export default function ExercisesPage() {
  const { all } = useExercises()
  const [query, setQuery] = useState("")
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const shown = filterExercises(all, query, pattern)
  return (
    <section className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Упражнения</h1>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию"
          aria-label="Поиск упражнений"
          className="pl-8"
        />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip active={pattern === null} onClick={() => setPattern(null)}>
          Все
        </Chip>
        {PATTERNS.map((p) => (
          <Chip key={p} active={pattern === p} onClick={() => setPattern(p)}>
            {PATTERN_RU[p]}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Найдено: {shown.length}</p>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Ничего не найдено</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shown.map((e) => (
            <ExerciseCard key={e.slug} exercise={e} />
          ))}
        </div>
      )}
    </section>
  )
}
