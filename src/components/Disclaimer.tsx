import { cn } from "@/lib/utils"

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Не медицинская рекомендация. При боли, травме или хронических заболеваниях согласуй нагрузку с врачом.
    </p>
  )
}
