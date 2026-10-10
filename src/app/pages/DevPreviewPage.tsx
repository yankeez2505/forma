import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { all, bySlug } from "@/features/exercises/useExercises"
import { generateBlock, type PlannedExercise } from "@/features/program/engine"
import { clearedAnkle, ownerBaseline, ownerConfig } from "@/features/program/engine/fixtures/owner"
import { BLOCK_RU, DAY_RU, dose, fmtDate } from "@/features/program/format"

const mainSets = (exs: PlannedExercise[]) => exs.reduce((n, e) => n + (e.block === "main" ? e.sets : 0), 0)

/** golden plan for the owner's fixture: a dev-only view over the engine, no network */
export default function DevPreviewPage() {
  const [blockIndex, setBlockIndex] = useState(0)
  const [cleared, setCleared] = useState(false)
  const sessions = useMemo(() => {
    const cfg = cleared ? { ...ownerConfig, latestTest: { ...ownerBaseline, ankle: clearedAnkle } } : ownerConfig
    return generateBlock(cfg, all, [], blockIndex, "preview")
  }, [blockIndex, cleared])

  return (
    <section className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Dev: превью программы</h1>
      <p className="text-sm text-muted-foreground">
        Фикстура владельца: 3 дня в неделю, 30 мин, цель «жир», голеностоп после перелома.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={String(blockIndex)} onValueChange={(v) => setBlockIndex(Number(v))}>
          <TabsList>
            <TabsTrigger value="0">Блок 0</TabsTrigger>
            <TabsTrigger value="1">Блок 1</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Switch id="ankle" checked={cleared} onCheckedChange={setCleared} />
          <Label htmlFor="ankle">Нога разблокирована</Label>
        </div>
      </div>
      <div className="grid gap-4">
        {sessions.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {fmtDate(s.date)}
                <Badge variant="secondary">{DAY_RU[s.dayType]}</Badge>
              </CardTitle>
              <CardDescription>
                Неделя {s.week} · ≈{s.estMin} мин · рабочих сетов: {mainSets(s.exercises)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Блок</TableHead>
                    <TableHead>Упражнение</TableHead>
                    <TableHead>Доза</TableHead>
                    <TableHead>RIR</TableHead>
                    <TableHead>Кг</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.exercises.map((e, i) => (
                    <TableRow key={`${e.slug}-${i}`}>
                      <TableCell className="text-muted-foreground">{BLOCK_RU[e.block]}</TableCell>
                      <TableCell>
                        {bySlug.get(e.slug)?.name ?? e.slug}
                        {e.note && <span className="block text-xs text-muted-foreground">{e.note}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{dose(e)}</TableCell>
                      <TableCell>{e.targetRir}</TableCell>
                      <TableCell>{e.loadKg ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
