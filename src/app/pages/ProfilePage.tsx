import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/useSession"
import { useDb } from "@/lib/db"
import { syncEnabled } from "@/lib/supabase"

function SyncStatus() {
  const { session, loading, signOut } = useSession()
  const pending = useDb((s) => s.pending.length)
  const navigate = useNavigate()
  if (!syncEnabled) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">Локальный режим</p>
        <p className="text-muted-foreground">
          Данные хранятся только на этом устройстве. Чтобы синхронизировать телефон и ноутбук, добавь ключи Supabase в .env.
        </p>
      </div>
    )
  }
  if (loading) return <Skeleton className="h-16 w-full" />
  if (!session) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <p className="text-muted-foreground">Войди, чтобы синхронизировать телефон и ноутбук.</p>
        <Button size="sm" onClick={() => navigate("/auth")}>
          Войти
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div>
        <p className="font-medium">Синхронизация включена</p>
        <p className="text-muted-foreground">
          {session.user.email}
          {pending > 0 ? " · не отправлено: " + pending : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => void signOut()}>
        Выйти
      </Button>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <section className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <SyncStatus />
    </section>
  )
}
