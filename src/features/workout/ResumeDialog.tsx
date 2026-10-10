import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate } from "@/features/program/format"
import { isoDate } from "@/features/program/model"
import type { ActiveWorkout } from "./activeWorkout"

/** "continue or abort?" for an unfinished workout of another session */
export function ResumeDialog({ conflict, onContinue, onAbort, onClose }: { conflict: ActiveWorkout | null; onContinue: () => void; onAbort: () => void; onClose: () => void }) {
  return (
    <Dialog open={conflict !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Есть незавершённая тренировка{conflict ? ` от ${fmtDate(isoDate(conflict.startedAt))}` : ""}</DialogTitle>
          <DialogDescription>Продолжить её или прервать и начать новую? Залогированные сеты прерванной сохранятся.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" onClick={onContinue}>
            Продолжить её
          </Button>
          <Button type="button" variant="outline" onClick={onAbort}>
            Прервать и начать новую
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
