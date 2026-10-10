import { useState } from "react"
import { Rating } from "@/components/Rating"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** post-workout RPE (1–10) and an optional note */
export function FinishSheet({ open, onOpenChange, onFinish }: { open: boolean; onOpenChange: (open: boolean) => void; onFinish: (rpe: number | null, notes: string) => void }) {
  const [rpe, setRpe] = useState<number>()
  const [notes, setNotes] = useState("")
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Как прошло?</DrawerTitle>
          <DrawerDescription>Общая тяжесть тренировки от 1 до 10</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 px-4">
          <Rating value={rpe} onChange={setRpe} min={1} max={10} labels={["легко", "предел"]} />
          <div className="grid gap-1.5">
            <Label htmlFor="finish-notes">Заметка (необязательно)</Label>
            <Input id="finish-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DrawerFooter>
          <Button type="button" size="lg" onClick={() => onFinish(rpe ?? null, notes)}>
            Сохранить тренировку
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
