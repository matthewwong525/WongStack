import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

const prompt = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), text: z.string().min(1) }),
  z.object({ state: z.literal('unavailable'), message: z.string() }),
])
const role = z.enum(['owner', 'employee'])
// A level for a saved key: `read` looks things up, `write` also changes or sends things. No level is None.
const level = z.enum(['read', 'write'])
const levels = z.record(z.string(), level)
// Whether this person may connect an assistant. `ready`: Connect installs the project for them. `lacked`: they
// hold no Project code, so Connect is greyed. `off`, or left out: the app can not hand the project out, and
// everyone keeps the apps-only connection.
const code = z.enum(['ready', 'lacked', 'off']).default('off')
export type Code = z.infer<typeof code>
export const setupSchema = z.object({ role, api: z.literal('authenticated'),
  identity: z.object({ email: z.string(), subject: z.string() }), apps: z.array(z.string()), titles: z.record(z.string(), z.string()).default({}), prompt, code,
  repository: z.literal('manual_provider_setup'), memory: z.literal('independent_operator_setup') })
// `legacy` has no recorded owner. `not_started` knows the owner, and everyone still keeps every app.
// `manages`: the person may manage Access, as the owner or a manager the owner chose; left out means no.
const manages = z.boolean().optional()
// `signIn`: the site stands behind a sign-in, so there is a session to end; left out or false, the frame offers no Sign out.
const signIn = z.boolean().optional()
export const appAccessSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('legacy'), signIn, code }),
  z.object({ state: z.literal('not_started'), role, manages, signIn, code, apps: z.array(z.string()) }),
  // `apps` is the screens the person can open, and `keys` their own level for each saved key, by name; empty until
  // key levels start.
  z.object({ state: z.literal('current'), role, manages, signIn, code, apps: z.array(z.string()), revision: z.number(),
    keys: z.array(z.object({ id: z.string(), title: z.string(), level })).optional() }),
])
// `settled` is true once the sign-in list matches a person's last change. A person has a `role`, whose apps and
// key levels are then theirs, or their own set: `apps` lists the apps they are given, by folder, and `keys` holds a
// level per key. The status's own `apps` is every app that can be given: each one with a screen, but Access itself.
// `unticked` names each person and role who could only look at an app, and so lost it, by the app's title, until
// the next save. A key's `alone` means it works with no app, `setup` that setup makes it, and `saved` that the app
// holds it. No key's value is ever here. `viewer` is who is looking,
// the owner or a manager; a person's `manager` says the owner lets them manage Access. The server checks both again
// on every save. A key's `direct` says its service is set up to be used directly, so a level for the key also
// reaches the service itself; left out means no. `project` says whether the app can hand its
// project out: `ready`, or the step left, a read-only GitHub `key` or Access `setup`. A status from before the
// field reads it from whether Project code is saved.
const project = z.enum(['ready', 'key', 'setup'])
export const statusSchema = z.object({ ownerEmail: z.string(), environment: z.enum(['live', 'practice']),
  viewer: z.object({ email: z.string(), owner: z.boolean() }),
  key: z.enum(['ready', 'missing', 'practice']), started: z.boolean(), imported: z.number(),
  keysStarted: z.boolean(),
  apps: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })),
  unticked: z.object({ people: z.array(z.object({ email: z.string(), apps: z.array(z.string()) })), roles: z.array(z.object({ name: z.string(), apps: z.array(z.string()) })) }),
  keys: z.array(z.object({ id: z.string(), title: z.string(), levels: z.array(level), saved: z.boolean(), setup: z.boolean(),
    alone: z.boolean(),
    direct: z.boolean().optional() })),
  roles: z.array(z.object({ id: z.string(), name: z.string(), apps: z.array(z.string()), keys: levels })),
  people: z.array(z.object({ email: z.string(), status: z.enum(['active', 'removed']), settled: z.boolean(),
    role: z.string().nullable(), manager: z.boolean(), apps: z.array(z.string()), keys: levels })),
  work: z.array(z.object({ kind: z.enum(['policy', 'sessions']), status: z.enum(['pending', 'ready', 'failed']) })),
  project: project.optional() })
  .transform(status => ({ ...status, project: status.project ?? (status.keys.some(key => key.id === 'code' && key.saved) ? 'ready' : 'key') }))
export type Status = z.infer<typeof statusSchema>
export type Person = Status['people'][number]
export type Role = Status['roles'][number]
export type SavedKey = Status['keys'][number]
export type BuiltApp = Status['apps'][number]
export type Level = z.infer<typeof level>

export async function readAccess<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/access/${path}`, { signal, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('Access unavailable')
  return schema.parse(await response.json())
}
export async function changeAccess(path: 'people' | 'roles' | 'retry', body?: object): Promise<void> {
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
