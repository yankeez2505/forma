import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { shortDate } from "./shortDate"

const config = {
  planned: { label: "План", color: "var(--muted-foreground)" },
  done: { label: "Факт", color: "var(--primary)" },
} satisfies ChartConfig

/** planned vs finished sessions per week */
export function PlanFactChart({ data }: { data: { week: string; planned: number; done: number }[] }) {
  return (
    <ChartContainer config={config} className="h-48 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Неделя с ${shortDate(String(v))}`} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="planned" fill="var(--color-planned)" radius={4} isAnimationActive={false} />
        <Bar dataKey="done" fill="var(--color-done)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}
