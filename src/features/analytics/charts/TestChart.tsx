import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { shortDate } from "./shortDate"

const config = {
  pushups: { label: "Отжимания", color: "var(--primary)" },
  squats: { label: "Приседания", color: "var(--foreground)" },
  plank_s: { label: "Планка, с", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export interface TestPoint {
  date: string
  pushups: number
  squats: number
  plank_s: number
}

/** test results over time; plank seconds use the right axis */
export function TestChart({ data }: { data: TestPoint[] }) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <LineChart data={data} margin={{ top: 8, right: -16, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line yAxisId="left" dataKey="pushups" type="monotone" stroke="var(--color-pushups)" strokeWidth={2} isAnimationActive={false} />
        <Line yAxisId="left" dataKey="squats" type="monotone" stroke="var(--color-squats)" strokeWidth={2} isAnimationActive={false} />
        <Line yAxisId="right" dataKey="plank_s" type="monotone" stroke="var(--color-plank_s)" strokeWidth={2} strokeDasharray="4 4" isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}
