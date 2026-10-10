import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { syncEnabled } from "@/lib/supabase"
import { normalizeOtp } from "./email"
import { useSession } from "./useSession"

export function AuthPage() {
  const { session, signIn, verify, signOut } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!syncEnabled) {
    return (
      <section className="space-y-2 p-4">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <p className="text-muted-foreground">
          Синхронизация выключена: добавь ключи Supabase в <code>.env</code>. Данные остаются на этом устройстве.
        </p>
      </section>
    )
  }
  if (session) {
    return (
      <section className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <p>Вы вошли как {session.user.email}</p>
        <Button variant="outline" onClick={() => void signOut()}>Выйти</Button>
      </section>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (step === "email") {
        await signIn(email)
        setStep("code")
      } else {
        await verify(email, code)
        navigate("/profile")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Вход</h1>
      <form onSubmit={submit} className="space-y-4">
        {step === "email" ? (
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="code">Код из письма</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(normalizeOtp(e.target.value))} />
            <p className="text-sm text-muted-foreground">Отправили 6-значный код на {email}</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {step === "email" ? "Отправить код" : "Войти"}
        </Button>
        {step === "code" && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("email")}>
            Другой e-mail
          </Button>
        )}
      </form>
    </section>
  )
}
