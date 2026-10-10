import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { Point } from "@/lib/calc"
import { shortDate } from "./shortDate"

const config = {
  raw: { label: "Замер", color: "var(--muted-foreground)" },
  mean: { label: "Среднее за 7 дней", color: "var(--primary)" },
} satisfies ChartConfig

/** weight: measurements as dots, the 7-day rolling mean as a line */
export function WeightChart({ raw, mean }: { raw: Point[]; mean: Point[] }) {
  const means = new Map(mean.map((p) => [p.date, p.value]))
  const data = raw.map((p) => ({ date: p.date, raw: p.value, mean: means.get(p.date) ?? null }))
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} />
        <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} tickCount={4} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="raw" stroke="var(--color-raw)" strokeOpacity={0} dot={{ r: 3, fill: "var(--color-raw)", strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line dataKey="mean" type="monotone" stroke="var(--color-mean)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}
