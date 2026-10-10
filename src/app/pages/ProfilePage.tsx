import { SyncStatus } from "@/features/profile/SyncStatus"

export default function ProfilePage() {
  return (
    <section className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <SyncStatus />
    </section>
  )
}
