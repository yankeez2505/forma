import type { EquipmentTag } from "@/lib/schema"
import type { Pattern } from "./types"

export const PATTERN_RU: Record<Pattern, string> = {
  squat: "Присед",
  hinge: "Наклон / мост",
  lunge: "Выпады",
  push_h: "Жим горизонтальный",
  push_v: "Жим вертикальный",
  pull_h: "Тяга горизонтальная",
  pull_v: "Тяга вертикальная",
  core: "Кор",
  calf: "Икры",
  mobility: "Мобильность",
  cardio: "Кардио",
  arms: "Руки",
  shoulder_iso: "Плечи",
}

export const EQUIPMENT_RU: Record<EquipmentTag, string> = {
  dumbbell: "Гантели",
  band: "Резинка",
  mat: "Коврик",
  rope: "Скакалка",
  roller: "Ролик",
  ball: "Мяч",
  chair: "Стул",
  wall: "Стена",
  bar: "Турник",
}
