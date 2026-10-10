import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import { TABLES, type TableName, type Tables } from "./schema"

export type Rows = { [T in TableName]: Record<string, Tables[T]> }
type Meta = "user_id" | "created_at" | "updated_at"
export type Upsertable<T extends TableName> = Omit<Tables[T], Meta> & Partial<Pick<Tables[T], Meta>>

export interface DbState {
  rows: Rows
  /** `${table}:${id}` of rows not yet pushed to the server, no duplicates */
  pending: string[]
  /** "local" until signed in; adoptUser() swaps it into every row */
  userId: string
  /** message of the last failed push, null after a clean pass; not persisted */
  lastSyncError: string | null
  upsert<T extends TableName>(table: T, row: Upsertable<T>): Tables[T]
  remove(table: TableName, id: string): void
  markSynced(keys: string[]): void
  /** after a full pull from the server */
  replaceAll(rows: Rows, pending?: string[]): void
  adoptUser(userId: string): void
  setSyncError(error: string | null): void
}

export const emptyRows = (): Rows => Object.fromEntries(TABLES.map((t) => [t, {}])) as Rows

const mem = new Map<string, string>()
const memoryStorage: StateStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    mem.set(k, v)
  },
  removeItem: (k) => {
    mem.delete(k)
  },
}

export const useDb = create<DbState>()(
  persist(
    (set, get) => ({
      rows: emptyRows(),
      pending: [],
      userId: "local",
      lastSyncError: null,
      upsert(table, row) {
        const s = get()
        const incoming = row as unknown as Tables[typeof table]
        const prev = s.rows[table][incoming.id] as Tables[typeof table] | undefined
        const now = new Date().toISOString()
        const next = { ...incoming, user_id: s.userId, created_at: prev?.created_at ?? incoming.created_at ?? now, updated_at: now }
        const key = `${table}:${incoming.id}`
        set({
          rows: { ...s.rows, [table]: { ...s.rows[table], [incoming.id]: next } } as Rows,
          pending: s.pending.includes(key) ? s.pending : [...s.pending, key],
        })
        return next
      },
      remove(table, id) {
        const s = get()
        const rest: Record<string, unknown> = { ...s.rows[table] }
        delete rest[id]
        set({ rows: { ...s.rows, [table]: rest } as Rows, pending: s.pending.filter((k) => k !== `${table}:${id}`) })
      },
      markSynced(keys) {
        set((s) => ({ pending: s.pending.filter((k) => !keys.includes(k)) }))
      },
      replaceAll(rows, pending) {
        set({ rows, pending: pending ?? [] })
      },
      adoptUser(userId) {
        const s = get()
        const rows = emptyRows()
        const pending: string[] = []
        for (const t of TABLES) {
          for (const r of Object.values(s.rows[t])) {
            /** profiles.id must equal auth.uid on the server; every other row keeps its client id */
            const id = t === "profiles" ? userId : r.id
            ;(rows[t] as Record<string, unknown>)[id] = { ...r, id, user_id: userId }
            pending.push(`${t}:${id}`)
          }
        }
        set({ userId, rows, pending })
      },
      setSyncError(error) {
        set({ lastSyncError: error })
      },
    }),
    {
      name: "forma-db",
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage : localStorage)),
      partialize: (s) => ({ rows: s.rows, pending: s.pending, userId: s.userId }),
    },
  ),
)

export const selectRows =
  <T extends TableName>(table: T) =>
  (s: DbState): Tables[T][] =>
    Object.values(s.rows[table])
