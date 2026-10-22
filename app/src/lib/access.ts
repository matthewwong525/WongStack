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
// Whether this person may connect an assistant: `ready` installs the project, `lacked` greys Connect (no Project
// code), and `off`, or left out, keeps everyone on the apps-only connection.
const code = z.enum(['ready', 'lacked', 'off']).default('off')
export type Code = z.infer<typeof code>
export const setupSchema = z.object({ role, api: z.literal('authenticated'),
  identity: z.object({ email: z.string(), subject: z.string() }), apps: z.array(z.string()), titles: z.record(z.string(), z.string()).default({}), prompt, code,
  repository: z.literal('manual_provider_setup'), memory: z.literal('independent_operator_setup') })
// `legacy` has no recorded owner. `not_started` knows the owner, and everyone still keeps every app.
// `manages`: the person may manage Access, as the owner or an Admin the owner chose; left out means no.
const manages = z.boolean().optional()
// `signIn`: the site stands behind a sign-in, so there is a session to end; left out or false, no Sign out shows.
const signIn = z.boolean().optional()
export const appAccessSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('legacy'), signIn, code }),
  z.object({ state: z.literal('not_started'), role, manages, signIn, code, apps: z.array(z.string()) }),
  // `apps` is the screens the person can open, and `keys` their own level for each saved key, by name; empty until
  // key levels start.
  z.object({ state: z.literal('current'), role, manages, signIn, code, apps: z.array(z.string()), revision: z.number(),
    keys: z.array(z.object({ id: z.string(), title: z.string(), level })).optional() }),
])
// The whole Access status. No key's value is ever here, and the server checks `viewer` again on every save.
// `project` and `projectSave`: `ready`, the step left, or `live` on a preview; left out, an older status, and no step.
const project = z.enum(['ready', 'key', 'setup', 'live'])
export const statusSchema = z.object({ ownerEmail: z.string(), environment: z.enum(['live', 'practice']),
  viewer: z.object({ email: z.string(), owner: z.boolean() }),
  key: z.enum(['ready', 'missing', 'practice']), started: z.boolean(), imported: z.number(),
  keysStarted: z.boolean(),
  apps: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })),
  unticked: z.object({ people: z.array(z.object({ email: z.string(), apps: z.array(z.string()) })), roles: z.array(z.object({ name: z.string(), apps: z.array(z.string()) })) }),
  keys: z.array(z.object({ id: z.string(), title: z.string(), levels: z.array(level), saved: z.boolean(), setup: z.boolean(),
    alone: z.boolean(),
    // Only the live app may ever hold it; an older status leaves it out.
    liveOnly: z.boolean().optional(),
    // What the key's service is for, and its API guide when the key is used directly; an older status has neither.
    direct: z.boolean().optional(), purpose: z.string().optional(), docs: z.string().optional() })),
  roles: z.array(z.object({ id: z.string(), name: z.string(), builtIn: z.boolean().optional(), apps: z.array(z.string()), keys: levels })),
  people: z.array(z.object({ email: z.string(), status: z.enum(['active', 'removed']), settled: z.boolean(),
    role: z.string().nullable(), apps: z.array(z.string()), keys: levels })),
  work: z.array(z.object({ kind: z.enum(['policy', 'sessions']), status: z.enum(['pending', 'ready', 'failed']) })),
  project: project.optional(), projectSave: project.optional() })
  .transform(status => ({ ...status, project: status.project ?? (status.keys.some(key => key.id === 'code' && key.saved) ? 'ready' : 'key') }))
export type Status = z.infer<typeof statusSchema>
export type Person = Status['people'][number]
export type Role = Status['roles'][number]
export type SavedKey = Status['keys'][number]
export type BuiltApp = Status['apps'][number]
export type Level = z.infer<typeof level>

// Who can push to the project on GitHub, each let in to previews alone. `state` says why none are listed: no GitHub
// key, a project kept elsewhere, Access not started, or a preview. `split`: the previews app has its own list yet.
export const pushersSchema = z.object({ state: z.enum(['listed', 'unavailable', 'no_github', 'not_github', 'not_started', 'live_only']),
  split: z.boolean().optional(),
  pushers: z.array(z.object({ githubId: z.number(), login: z.string(), email: z.string().nullable(),
    emailSource: z.enum(['owner', 'profile', 'commit']).nullable(), canOpenPreviews: z.boolean() })) })
export type Pushers = z.infer<typeof pushersSchema>
export type Pusher = Pushers['pushers'][number]

/** The owner or an Admin types a pusher's email; the server checks again who is asking. */
export async function savePusherEmail(githubId: number, email: string): Promise<void> {
  const response = await fetch(`/api/access/pushers/${githubId}`, { method: 'PUT', redirect: 'error',
    headers: { Origin: window.location.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
  if (!response.ok) throw new Error('Access change unavailable')
}

/** Whether a person holds the built-in Admin role. */
export const isAdmin = (status: Pick<Status, 'roles'>, person: Pick<Person, 'role'>) => status.roles.some(role => role.builtIn && role.id === person.role)

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
