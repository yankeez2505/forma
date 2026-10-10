import { Link, Outlet } from "react-router"
import { UserRound } from "lucide-react"
import { BottomNav } from "./BottomNav"

export default function AppLayout() {
  return (
    <div className="mx-auto min-h-svh max-w-md pb-20 md:max-w-3xl">
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Forma
        </Link>
        <Link to="/profile" aria-label="Профиль" className="rounded-full p-2 hover:bg-accent">
          <UserRound className="size-5" />
        </Link>
      </header>
      <Outlet />
      <BottomNav />
    </div>
  )
}
