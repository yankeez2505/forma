import { Link, useParams } from "react-router"
import { ArrowLeft, Dumbbell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EQUIPMENT_RU } from "@/content/labels"
import { MUSCLE_RU } from "@/content/muscles"
import { assetUrl } from "./ExerciseCard"
import { useExercises } from "./useExercises"

export default function ExercisePage() {
  const { slug = "" } = useParams()
  const exercise = useExercises().bySlug.get(slug)
  if (!exercise) {
    return (
      <section className="space-y-4 p-4">
        <p className="text-muted-foreground">Упражнение не найдено.</p>
        <Button asChild variant="outline">
          <Link to="/exercises">К списку</Link>
        </Button>
      </section>
    )
  }
  const equipment = exercise.equipment.length
    ? exercise.equipment.map((t) => EQUIPMENT_RU[t]).join(", ")
    : "Без инвентаря"
  return (
    <article className="space-y-4 p-4">
      <Link to="/exercises" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Упражнения
      </Link>
      <h1 className="text-2xl font-semibold">{exercise.name}</h1>
      <div className="flex flex-wrap gap-1.5">
        {exercise.primaryMuscles.map((m) => (
          <Badge key={m}>{MUSCLE_RU[m]}</Badge>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <Badge key={m} variant="outline">
            {MUSCLE_RU[m]}
          </Badge>
        ))}
        {exercise.impact && <Badge variant="destructive">Ударная нагрузка</Badge>}
      </div>
      <Tabs defaultValue={exercise.images.length ? "photo" : "3d"}>
        <TabsList className="w-full">
          <TabsTrigger value="3d">3D</TabsTrigger>
          <TabsTrigger value="photo">Фото</TabsTrigger>
        </TabsList>
        <TabsContent value="3d">
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            3D-модель появится в следующем шаге
          </div>
        </TabsContent>
        <TabsContent value="photo">
          {exercise.images.length ? (
            <div className="grid grid-cols-2 gap-2">
              {exercise.images.map((src, i) => (
                <img
                  key={src}
                  src={assetUrl(src)}
                  alt={`${exercise.name}, кадр ${i + 1}`}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Фото нет</p>
          )}
        </TabsContent>
      </Tabs>
      <section>
        <h2 className="mb-2 font-medium">Техника</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {exercise.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </section>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Dumbbell className="size-4" aria-hidden />
        {equipment}
      </p>
    </article>
  )
}
