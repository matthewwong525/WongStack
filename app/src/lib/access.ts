import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

// The app's own reads of Access: who may open which app, and the viewer's setup message. The Access page itself is a
// module with its own client: the shell only mounts it.

const prompt = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), text: z.string().min(1) }),
  z.object({ state: z.literal('unavailable'), message: z.string() }),
])
const role = z.enum(['owner', 'employee'])
// A level for a saved key: `read` looks things up, `write` also changes or sends things. No level is None.
const level = z.enum(['read', 'write'])
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
async function readAccess<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/access/${path}`, { signal, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('Access unavailable')
  return schema.parse(await response.json())
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
