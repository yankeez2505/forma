import { Button } from "@/components/ui/button"

interface RatingProps {
  value?: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** captions under the first and the last button */
  labels?: [string, string]
}

/** a full-width row of min…max buttons; the chosen one is filled */
export function Rating({ value, onChange, min = 1, max = 5, labels }: RatingProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div>
      <div role="radiogroup" className="grid grid-flow-col auto-cols-fr gap-1.5">
        {values.map((v) => (
          <Button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            variant={v === value ? "default" : "outline"}
            size="lg"
            className="w-full px-0"
            onClick={() => onChange(v)}
          >
            {v}
          </Button>
        ))}
      </div>
      {labels && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}
