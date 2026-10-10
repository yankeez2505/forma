import type { SupabaseClient } from "@supabase/supabase-js"
import { emptyRows, useDb } from "./db"
import { TABLES, type TableName } from "./schema"

type Db = typeof useDb
type Row = { id: string; updated_at: string }
/** PostgREST caps a select at 1000 rows; pull in pages until a short one */
const PAGE = 1000

const split = (key: string): [TableName, string] => {
  const i = key.indexOf(":")
  return [key.slice(0, i) as TableName, key.slice(i + 1)]
}

/** Upserts every pending row grouped by table; returns how many rows the server confirmed. */
export async function pushPending(client: SupabaseClient, db: Db = useDb): Promise<number> {
  const s = db.getState()
  const groups = new Map<TableName, { keys: string[]; ids: string[]; rows: Row[] }>()
  for (const key of s.pending) {
    const [table, id] = split(key)
    const row = (s.rows[table] as Record<string, Row> | undefined)?.[id]
    if (!row) {
      db.getState().markSynced([key])
      continue
    }
    const g = groups.get(table) ?? { keys: [], ids: [], rows: [] }
    g.keys.push(key)
    g.ids.push(id)
    g.rows.push(row)
    groups.set(table, g)
  }
  let n = 0
  for (const [table, g] of groups) {
    const { error } = await client.from(table).upsert(g.rows, { onConflict: "id" })
    if (error) continue
    /** a row edited while its upsert was in flight stays pending: the server got the old version */
    const now = db.getState().rows[table] as Record<string, Row>
    db.getState().markSynced(g.keys.filter((_, i) => now[g.ids[i]] === g.rows[i]))
    n += g.rows.length
  }
  return n
}

async function pullTable(client: SupabaseClient, table: TableName): Promise<Row[] | undefined> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").order("id").range(from, from + PAGE - 1)
    if (error || !data) return undefined
    out.push(...(data as Row[]))
    if (data.length < PAGE) return out
  }
}

/** Pulls every table. A server row replaces the local one only when its updated_at is newer; local winners stay pending. */
export async function pullAll(client: SupabaseClient, db: Db = useDb): Promise<void> {
  const server = new Map<TableName, Row[]>()
  for (const table of TABLES) {
    const rows = await pullTable(client, table)
    if (rows) server.set(table, rows)
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
