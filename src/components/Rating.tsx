import { Button } from "@/components/ui/button"

interface RatingProps {
  value?: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** captions under the first and the last button */
  labels?: [string, string]
}

/** a row of min…max buttons; the chosen one is filled */
export function Rating({ value, onChange, min = 1, max = 5, labels }: RatingProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div>
      <div role="radiogroup" className="flex gap-2">
        {values.map((v) => (
          <Button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            variant={v === value ? "default" : "outline"}
            size="icon-lg"
            onClick={() => onChange(v)}
          >
            {v}
          </Button>
        ))}
      </div>
      {labels && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground" style={{ maxWidth: `${values.length * 2.25 + (values.length - 1) * 0.5}rem` }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}
