import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

const prompt = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), text: z.string().min(1) }),
  z.object({ state: z.literal('unavailable'), message: z.string() }),
])
const role = z.enum(['owner', 'employee'])
export const setupSchema = z.object({ role, api: z.literal('authenticated'),
  identity: z.object({ email: z.string(), subject: z.string() }), apps: z.array(z.string()), prompt,
  repository: z.literal('manual_provider_setup'), memory: z.literal('independent_operator_setup') })
// `legacy` has no recorded owner. `not_started` knows the owner, and everyone still keeps every app.
export const appAccessSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('legacy') }),
  z.object({ state: z.literal('not_started'), role, apps: z.array(z.string()) }),
  z.object({ state: z.literal('current'), role, apps: z.array(z.string()), revision: z.number() }),
])
// `settled` is true once the sign-in list matches a person's last change.
export const statusSchema = z.object({ origin: z.string(), ownerEmail: z.string(), environment: z.enum(['live', 'practice']),
  key: z.enum(['ready', 'missing', 'practice']), started: z.boolean(), imported: z.number(), apps: z.array(z.string()),
  people: z.array(z.object({ email: z.string(), status: z.enum(['active', 'removed']), settled: z.boolean(), apps: z.array(z.string()) })),
  work: z.array(z.object({ kind: z.enum(['policy', 'sessions']), status: z.enum(['pending', 'ready', 'failed']) })) })
export type Status = z.infer<typeof statusSchema>
export type Person = Status['people'][number]

export async function readAccess<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/access/${path}`, { signal, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('Access unavailable')
  return schema.parse(await response.json())
}
export async function changeAccess(path: 'people' | 'retry', body?: object): Promise<void> {
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
