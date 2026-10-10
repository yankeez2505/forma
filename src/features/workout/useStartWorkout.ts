import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { all as exercises } from "@/features/exercises/useExercises"
import type { CheckIn } from "@/features/program/engine"
import { useDb } from "@/lib/db"
import { abortWorkout, planForStart, startWorkout, useActiveWorkout, type ActiveWorkout } from "./activeWorkout"

interface Request {
  plannedId: string
  checkIn: CheckIn | null
}

/** starts a planned session; an unfinished draft of another session becomes `conflict` until the user decides */
export function useStartWorkout() {
  const navigate = useNavigate()
  const [conflict, setConflict] = useState<ActiveWorkout | null>(null)
  const [pending, setPending] = useState<Request | null>(null)

  const launch = (req: Request) => {
    const { rows, upsert } = useDb.getState()
    const row = rows.planned_sessions[req.plannedId]
    const out = planForStart(rows, req.plannedId, req.checkIn, exercises)
    if (!row || !out) {
      toast.error("Сессия не найдена")
      return
    }
    const { workout, draft, plannedRow } = startWorkout(row, out.prepared, out.plan, req.checkIn, new Date())
    upsert("workouts", workout)
    upsert("planned_sessions", plannedRow)
    useActiveWorkout.getState().set(draft)
    navigate(`/workout/${draft.workoutId}`)
  }
  const dismiss = () => {
    setConflict(null)
    setPending(null)
  }
  const start = (plannedId: string, checkIn: CheckIn | null = null) => {
    const draft = useActiveWorkout.getState().draft
    if (draft?.plannedSessionId === plannedId) {
      navigate(`/workout/${draft.workoutId}`)
      return
    }
    if (draft) {
      setPending({ plannedId, checkIn })
      setConflict(draft)
      return
    }
    launch({ plannedId, checkIn })
  }
  const continueActive = () => {
    if (conflict) navigate(`/workout/${conflict.workoutId}`)
    dismiss()
  }
  const abortActive = () => {
    if (!conflict) return
    const { rows, upsert } = useDb.getState()
    const row = rows.workouts[conflict.workoutId]
    const aborted = row ? abortWorkout(row, Object.keys(conflict.sets).length, new Date()) : null
    if (aborted) upsert("workouts", aborted)
    useActiveWorkout.getState().set(null)
    const req = pending
    dismiss()
    if (req) launch(req)
  }
  return { start, conflict, continueActive, abortActive, dismiss }
}
