import { Button } from "@/components/ui/button"
import { mmss, useCountdown } from "./useCountdown"

/** sticky rest countdown; renders nothing once the deadline has passed */
export function RestTimer({ until, onSkip, onExtend }: { until: number; onSkip: () => void; onExtend: (seconds: number) => void }) {
  const left = useCountdown(until)
  if (left <= 0) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-background p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Отдых</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
            {mmss(left)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onExtend(30)}>
            +30 с
          </Button>
          <Button type="button" variant="secondary" onClick={onSkip}>
            Пропустить
          </Button>
        </div>
      </div>
    </div>
  )
}
