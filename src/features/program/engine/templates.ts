import type { DayType, Template } from "./types"

/** 2–3 sessions a week: whole body each time, A/B alternate */
const FULLBODY: Template = {
  kind: "fullbody",
  days: [
    {
      dayType: "A",
      slots: [
        { pattern: "squat", sets: 3 },
        { pattern: "push_h", sets: 3 },
        { pattern: "pull_h", sets: 3 },
        { pattern: "core", sets: 2 },
      ],
    },
    {
      dayType: "B",
      slots: [
        { pattern: "hinge", sets: 3 },
        { pattern: "push_v", fallback: "push_h", sets: 2 },
        { pattern: "pull_v", fallback: "pull_h", sets: 2 },
        { pattern: "lunge", sets: 2 },
        { pattern: "calf", sets: 2 },
      ],
    },
  ],
}

/** 4 sessions a week: upper / lower split */
const UPPERLOWER: Template = {
  kind: "upperlower",
  days: [
    {
      dayType: "U",
      slots: [
        { pattern: "push_h", sets: 3 },
        { pattern: "pull_h", sets: 3 },
        { pattern: "push_v", fallback: "push_h", sets: 2 },
        { pattern: "pull_v", fallback: "pull_h", sets: 2 },
        { pattern: "arms", sets: 1 },
      ],
    },
    {
      dayType: "L",
      slots: [
        { pattern: "squat", sets: 3 },
        { pattern: "hinge", sets: 3 },
        { pattern: "lunge", sets: 2 },
        { pattern: "calf", sets: 2 },
        { pattern: "core", sets: 2 },
      ],
    },
  ],
}

export function getTemplate(days: 2 | 3 | 4): Template {
  return days === 4 ? UPPERLOWER : FULLBODY
}

export function dayTypeFor(tpl: Template, sessionIndex: number): DayType {
  return tpl.days[sessionIndex % tpl.days.length].dayType
}
