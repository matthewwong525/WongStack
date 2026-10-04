import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

const prompt = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), text: z.string().min(1) }),
  z.object({ state: z.literal('unavailable'), message: z.string() }),
])
export const setupSchema = z.object({ role: z.enum(['owner', 'employee']), api: z.literal('authenticated'),
  identity: z.object({ email: z.string(), subject: z.string() }), apps: z.array(z.string()), prompt,
  repository: z.literal('manual_provider_setup'), memory: z.literal('independent_operator_setup') })
export const appAccessSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('legacy') }),
  z.object({ state: z.literal('current'), role: z.enum(['owner', 'employee']), apps: z.array(z.string()), revision: z.number() }),
])
export const statusSchema = z.object({ origin: z.string(), ownerEmail: z.string(), policyEnabled: z.boolean(), apps: z.array(z.string()),
  people: z.array(z.object({ email: z.string(), status: z.enum(['active', 'removed']), apps: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))) })),
  connections: z.array(z.object({ provider: z.literal('access'), status: z.string(), detail: z.string().nullable() })),
  work: z.array(z.object({ kind: z.enum(['policy', 'sessions']), status: z.string(), outcome: z.string().nullable(), error_code: z.string().nullable() })),
  policyWrites: z.array(z.object({ status: z.string() })), limits: z.string() })
export type Status = z.infer<typeof statusSchema>
export type Person = Status['people'][number]

export async function readAccess<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/access/${path}`, { signal, cache: 'no-store', redirect: 'error' })
  if (!response.ok) throw new Error('Access unavailable')
  return schema.parse(await response.json())
}
export async function changeAccess(path: 'people' | 'retry' | 'login/connect', body?: object): Promise<void> {
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
