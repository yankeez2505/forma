import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  id: string
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  hint?: string
  step?: number
  placeholder?: string
}

/** labelled numeric input; an empty field is `undefined`, never NaN */
export function NumberField({ id, label, value, onChange, hint, step = 1, placeholder }: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode={step === 1 ? "numeric" : "decimal"}
        min={0}
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
