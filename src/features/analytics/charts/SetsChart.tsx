import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const config = { sets: { label: "Подходы", color: "var(--primary)" } } satisfies ChartConfig

/** working sets of the week per muscle group, horizontal bars */
export function SetsChart({ data }: { data: { group: string; sets: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.length * 36 + 8 }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="group" type="category" tickLine={false} axisLine={false} width={72} />
        <Bar dataKey="sets" fill="var(--color-sets)" radius={4} isAnimationActive={false}>
          <LabelList dataKey="sets" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
