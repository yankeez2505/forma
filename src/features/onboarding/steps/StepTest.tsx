import { useState } from "react"
import { TestForm } from "@/features/checkpoints/TestForm"
import { completeTest, type TestDraft } from "@/features/checkpoints/testDraft"
import type { StepProps } from "../draft"

export function StepTest({ d, patch }: StepProps) {
  const withAnkle = d.injuries.includes("ankle")
  const [draft, setDraft] = useState<TestDraft>(() => ({ ...d.test, ...d.test?.ankle }))
  const change = (v: TestDraft) => {
    setDraft(v)
    patch({ test: completeTest(v, withAnkle) ?? undefined })
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Разминка 3 минуты, затем три подхода до отказа техники с отдыхом 2 минуты.</p>
      <TestForm value={draft} onChange={change} withAnkle={withAnkle} />
    </div>
  )
}
