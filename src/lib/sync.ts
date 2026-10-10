import type { SupabaseClient } from "@supabase/supabase-js"
import { emptyRows, useDb } from "./db"
import { TABLES, type TableName } from "./schema"

type Db = typeof useDb
type Row = { id: string; updated_at: string }

const split = (key: string): [TableName, string] => {
  const i = key.indexOf(":")
  return [key.slice(0, i) as TableName, key.slice(i + 1)]
}

/** Upserts every pending row grouped by table; returns how many rows the server confirmed. */
export async function pushPending(client: SupabaseClient, db: Db = useDb): Promise<number> {
  const s = db.getState()
  const groups = new Map<TableName, { keys: string[]; rows: Row[] }>()
  for (const key of s.pending) {
    const [table, id] = split(key)
    const row = (s.rows[table] as Record<string, Row> | undefined)?.[id]
    if (!row) {
      db.getState().markSynced([key])
      continue
    }
    const g = groups.get(table) ?? { keys: [], rows: [] }
    g.keys.push(key)
    g.rows.push(row)
    groups.set(table, g)
  }
  let n = 0
  for (const [table, g] of groups) {
    const { error } = await client.from(table).upsert(g.rows, { onConflict: "id" })
    if (error) continue
    db.getState().markSynced(g.keys)
    n += g.rows.length
  }
  return n
}

/** Pulls every table. A server row replaces the local one only when its updated_at is newer; local winners stay pending. */
export async function pullAll(client: SupabaseClient, db: Db = useDb): Promise<void> {
  const server = new Map<TableName, Row[]>()
  for (const table of TABLES) {
    const { data, error } = await client.from(table).select("*")
    if (!error && data) server.set(table, data as Row[])
  }
  const s = db.getState()
  const merged = emptyRows()
  const pending = new Set(s.pending)
  for (const table of TABLES) {
    const local = s.rows[table] as Record<string, Row>
    const out = Object.assign(merged[table] as Record<string, Row>, local)
    for (const srv of server.get(table) ?? []) {
      const mine = local[srv.id]
      if (mine && Date.parse(mine.updated_at) >= Date.parse(srv.updated_at)) continue
      out[srv.id] = srv
      pending.delete(`${table}:${srv.id}`)
    }
  }
  db.getState().replaceAll(merged, s.pending.filter((k) => pending.has(k)))
}

/** Pushes on start, when back online and 1 s after new pending rows appear. Returns a stop function. */
export function startSync(client: SupabaseClient, db: Db = useDb): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    if (db.getState().userId === "local" || !navigator.onLine) return
    pushPending(client, db).catch(() => undefined)
  }
  const unsub = db.subscribe((s, prev) => {
    if (s.pending.length > prev.pending.length) {
      clearTimeout(timer)
      timer = setTimeout(run, 1000)
    }
  })
  window.addEventListener("online", run)
  run()
  return () => {
    clearTimeout(timer)
    window.removeEventListener("online", run)
    unsub()
  }
}
