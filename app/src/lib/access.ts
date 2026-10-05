import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

const prompt = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), text: z.string().min(1) }),
  z.object({ state: z.literal('unavailable'), message: z.string() }),
])
const role = z.enum(['owner', 'employee'])
// A saved key's level: `read` looks things up, `write` also changes or sends things. No level is None.
const level = z.enum(['read', 'write'])
const levels = z.record(z.string(), level)
export const setupSchema = z.object({ role, api: z.literal('authenticated'),
  identity: z.object({ email: z.string(), subject: z.string() }), apps: z.array(z.string()), prompt,
  repository: z.literal('manual_provider_setup'), memory: z.literal('independent_operator_setup') })
// `legacy` has no recorded owner. `not_started` knows the owner, and everyone still keeps every app.
// `manages`: the person may manage Access, as the owner or a manager the owner chose; left out means no.
const manages = z.boolean().optional()
export const appAccessSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('legacy') }),
  z.object({ state: z.literal('not_started'), role, manages, apps: z.array(z.string()) }),
  // `keys` is the signed-in person's own level for each saved key, by name; empty until key levels start.
  z.object({ state: z.literal('current'), role, manages, apps: z.array(z.string()), revision: z.number(),
    keys: z.array(z.object({ id: z.string(), title: z.string(), level })).optional() }),
])
const use = z.object({ id: z.string(), need: level })
// `settled` is true once the sign-in list matches a person's last change. A person has a `role`, whose apps
// and key levels are then theirs, or their own set. `kept` counts the people who kept their access when key
// levels started, until the next save. `appKeys` is what each app does with each key; a key's `usedBy` is the
// same fact from the key's side, `alone` means it also works with no app, `setup` that setup makes it, and
// `saved` that the app holds it. No key's value is ever here. `viewer` is who is looking, the owner or a manager;
// a person's `manager` says the owner lets them manage Access. The server checks both again on every save.
export const statusSchema = z.object({ ownerEmail: z.string(), environment: z.enum(['live', 'practice']),
  viewer: z.object({ email: z.string(), owner: z.boolean() }),
  key: z.enum(['ready', 'missing', 'practice']), started: z.boolean(), imported: z.number(),
  keysStarted: z.boolean(), kept: z.number(), apps: z.array(z.string()), appKeys: z.record(z.string(), z.array(use)),
  keys: z.array(z.object({ id: z.string(), title: z.string(), levels: z.array(level), saved: z.boolean(), setup: z.boolean(),
    usedBy: z.array(z.object({ app: z.string(), need: level })), alone: z.boolean() })),
  roles: z.array(z.object({ id: z.string(), name: z.string(), apps: z.array(z.string()), keys: levels })),
  people: z.array(z.object({ email: z.string(), status: z.enum(['active', 'removed']), settled: z.boolean(),
    role: z.string().nullable(), manager: z.boolean(), apps: z.array(z.string()), keys: levels })),
  work: z.array(z.object({ kind: z.enum(['policy', 'sessions']), status: z.enum(['pending', 'ready', 'failed']) })) })
export type Status = z.infer<typeof statusSchema>
export type Person = Status['people'][number]
export type Role = Status['roles'][number]
export type SavedKey = Status['keys'][number]
export type Level = z.infer<typeof level>

export async function readAccess<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/access/${path}`, { signal, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('Access unavailable')
  return schema.parse(await response.json())
}
export async function changeAccess(path: 'people' | 'roles' | 'grants' | 'retry', body?: object): Promise<void> {
  const response = await fetch(`/api/access/${path}`, { method: 'POST', redirect: 'error',
    headers: { Origin: window.location.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
  if (!response.ok) throw new Error('Access change unavailable')
}
export function useAccess<T>(path: string, schema: z.ZodType<T>) {
  const [revision, refresh] = useState(0)
  const key = useMemo(() => ({ path, schema, revision }), [path, schema, revision])
  const [state, setState] = useState<{ key: typeof key | null; data: T | null; error: boolean }>({ key: null, data: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    readAccess(key.path, key.schema, controller.signal).then(
      data => { if (!controller.signal.aborted) setState({ key, data, error: false }) },
      () => { if (!controller.signal.aborted) setState({ key, data: null, error: true }) },
    )
    return () => controller.abort()
  }, [key])
  // A changed request hides the previous permission immediately, including
  // before effect cleanup; only this exact request's asynchronous result shows.
  const current = state.key === key
  return { data: current ? state.data : null, error: current && state.error, reload: () => refresh(value => value + 1) }
}
