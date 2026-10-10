import { Link } from "react-router"
import { Dumbbell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MUSCLE_RU } from "@/content/muscles"
import type { Exercise } from "@/content/types"

/** public asset path → URL under the app base (GitHub Pages serves from /forma/) */
export const assetUrl = (path: string) => import.meta.env.BASE_URL + path

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const img = exercise.images[0]
  return (
    <Link
      to={`/exercises/${exercise.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
    >
      {img ? (
        <img src={assetUrl(img)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground">
          <Dumbbell className="size-8" aria-hidden />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm leading-snug font-medium">{exercise.name}</p>
        <div className="mt-auto flex flex-wrap gap-1">
          {exercise.primaryMuscles.map((m) => (
            <Badge key={m} variant="secondary">
              {MUSCLE_RU[m]}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  )
}
