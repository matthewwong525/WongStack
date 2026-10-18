import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { SavedKey } from '../../lib/access'

// One MCP as the app lists it: who is connected, whose sign-in is shared and how, and the viewer's own. No token is
// ever here, and the parse keeps only these fields.
const share = z.enum(['read', 'all'])
const serverSchema = z.object({ id: z.string(), name: z.string(), url: z.string(), purpose: z.string(), tools: z.number(),
  toolsAt: z.string().nullable(), connected: z.number(), shared: z.object({ who: z.string(), share }).nullable(),
  own: z.object({ state: z.enum(['connected', 'reconnect']), account: z.string().nullable(), at: z.string(), share: z.enum(['none', 'read', 'all']) }).nullable(),
  addedBy: z.string(), removable: z.boolean(), connect: z.string() })
const serversSchema = z.object({ sealed: z.boolean(), manages: z.boolean(), me: z.string(), servers: z.array(serverSchema) })
export const answerSchema = z.object({ server: serverSchema })
export type Server = z.infer<typeof serverSchema>
export type Servers = z.infer<typeof serversSchema>
export type Share = NonNullable<Server['own']>['share']

export const UNFINISHED = 'That did not finish. Check the list below before trying again.'

/** The keys Services lists: every saved key but the project's own code, which Access gives as its own ticks. */
export const keyRows = (keys: SavedKey[]) => keys.filter(key => key.id !== 'code')

/** A refusal the server explains in plain words, safe to show. */
export class Refusal extends Error {}

/** One change to the MCPs. A refusal throws its plain words; anything else did not finish. */
export async function sendMcp<T>(path: string, schema: z.ZodType<T>, method: 'POST' | 'DELETE' = 'POST', body: object = {}): Promise<T> {
  const response = await fetch(`/api/mcp/${path}`, { method, redirect: 'error',
    headers: { Origin: window.location.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const answer: unknown = await response.json()
  if (!response.ok) throw new Refusal(z.object({ error: z.object({ message: z.string() }) }).parse(answer).error.message)
  return schema.parse(answer)
}

/** Where Connect sends the browser: the service's own sign-in page. */
export const browser = { go: (url: string) => window.location.assign(url) }

export type McpRead = { data: Servers | null; error: boolean; reload: () => void; keep: (server: Server) => void; drop: (id: string) => void }

/** The MCP list, read once. A change puts the row it answers with in place, so the list never empties as it saves. */
export function useServers(): McpRead {
  const [read, setRead] = useState<{ data: Servers | null; error: boolean }>({ data: null, error: false })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    fetch('/api/mcp/servers', { cache: 'no-store', redirect: 'error' }).then(async response => serversSchema.parse(await response.json()))
      .then(data => setRead({ data, error: false }), () => setRead(({ data }) => ({ data, error: !data })))
  }, [revision])
  const change = (servers: (list: Server[]) => Server[]) => setRead(({ data }) => ({ error: false, data: { ...data!, servers: servers(data!.servers) } }))
  return { ...read,
    reload: () => { setRead(({ data }) => ({ data, error: false })); setRevision(value => value + 1) },
    keep: server => change(list => list.some(item => item.id === server.id) ? list.map(item => item.id === server.id ? server : item) : [...list, server]),
    drop: id => change(list => list.filter(item => item.id !== id)) }
}
