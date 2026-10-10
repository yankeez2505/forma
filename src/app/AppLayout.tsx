import { Link, Outlet, useLocation } from "react-router"
import { cn } from "@/lib/utils"
import { UserRound } from "lucide-react"
import { BottomNav } from "./BottomNav"

export default function AppLayout() {
  const { pathname } = useLocation()
  const bare = pathname.startsWith("/onboarding") || pathname.startsWith("/workout")
  return (
    <div className={cn("mx-auto min-h-svh max-w-md md:max-w-3xl", bare ? "pb-6" : "pb-20")}>
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Forma
        </Link>
        <Link to="/profile" aria-label="Профиль" className="rounded-full p-2 hover:bg-accent">
          <UserRound className="size-5" />
        </Link>
      </header>
      <Outlet />
      {!bare && <BottomNav />}
    </div>
  )
}
