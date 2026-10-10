import type { Session } from "@supabase/supabase-js"
import { create } from "zustand"
import { emptyRows, useDb } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import { pullAll, startSync } from "@/lib/sync"
import { normalizeEmail, normalizeOtp } from "./email"

interface SessionState {
  session: Session | null
  loading: boolean
}
const useStore = create<SessionState>(() => ({ session: null, loading: supabase !== null }))

let stopSync: (() => void) | undefined
let currentUid: string | null = null

async function onSession(session: Session | null) {
  useStore.setState({ session, loading: false })
  const uid = session?.user.id ?? null
  if (uid === currentUid) return
  currentUid = uid
  stopSync?.()
  stopSync = undefined
  if (!uid || !supabase) return
  const db = useDb.getState()
  if (db.userId !== uid) {
    if (db.userId !== "local") db.replaceAll(emptyRows()) // another account: never adopt rows that are not yours
    useDb.getState().adoptUser(uid)
  }
  await pullAll(supabase)
  stopSync = startSync(supabase) // pushes whatever the pull left pending
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => onSession(data.session))
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void onSession(session), 0)
  })
}

const client = () => {
  if (!supabase) throw new Error("Синхронизация выключена")
  return supabase
}

export function useSession() {
  const { session, loading } = useStore()
  return {
    session,
    loading,
    signIn: async (email: string) => {
      const { error } = await client().auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: true } })
      if (error) throw new Error(error.message)
    },
    verify: async (email: string, code: string) => {
      const { error } = await client().auth.verifyOtp({ email: normalizeEmail(email), token: normalizeOtp(code), type: "email" })
      if (error) throw new Error(error.message)
    },
    signOut: async () => {
      await client().auth.signOut()
    },
  }
}
