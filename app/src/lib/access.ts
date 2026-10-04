import { useEffect, useState } from 'react'
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
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false })
  const [revision, refresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, error: false })
    readAccess(path, schema, controller.signal).then(
      data => { if (!controller.signal.aborted) setState({ data, error: false }) },
      () => { if (!controller.signal.aborted) setState({ data: null, error: true }) },
    )
    return () => controller.abort()
  }, [path, schema, revision])
  return { ...state, reload: () => refresh(value => value + 1) }
}
