import { NavLink } from "react-router"
import { CalendarDays, Dumbbell, Home, LineChart, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { to: "/", label: "Сегодня", Icon: Home },
  { to: "/calendar", label: "Календарь", Icon: CalendarDays },
  { to: "/exercises", label: "Упражнения", Icon: Dumbbell },
  { to: "/progress", label: "Прогресс", Icon: LineChart },
  { to: "/nutrition", label: "Питание", Icon: Utensils },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5 md:max-w-3xl">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
