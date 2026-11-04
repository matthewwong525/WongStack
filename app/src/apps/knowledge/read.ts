import { useEffect, useState } from 'react'

// The Knowledge app's own routes, read in the shapes app/worker/apps/knowledge/api.ts writes.
export type Listing = { commit: string; capped: boolean; pages: { path: string; title: string }[] }
export type Found = { commit: string; capped: boolean; hits: { path: string; title: string; line: string }[] }
export type Page = { commit: string; path: string; title: string; public: boolean; html: string; markdown: string; saved: string }
/** Why an answer is not there: no such page, no knowledge repository on this app, or anything else. */
export type Problem = 'missing' | 'not-set-up' | 'failed'

export const BASE = '/apps/knowledge/'
/** A page's address: its path without `.md`, and a folder's README as the folder. */
export const address = (path: string) => path.replace(/\.md$/, '').replace(/\/README$/, '')
export const isProblem = (answer: unknown): answer is Problem => typeof answer === 'string'

async function read<T>(route: string): Promise<T | Problem> {
  try {
    const response = await fetch(`${BASE}api/${route}`)
    const body = await response.json()
    if (response.ok) return body as T
    const code = (body as { error: { code?: string } }).error.code
    return code === 'not_set_up' ? 'not-set-up' : code === 'not_found' ? 'missing' : 'failed'
  } catch {
    return 'failed'
  }
}

/** A route's answer, undefined while it loads, and a retry. `wait` lets fast typing settle into one read. */
export function useRead<T>(route: string, wait = 0): [T | Problem | undefined, () => void] {
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<{ key: string; value: T | Problem } | null>(null)
  const key = `${attempt} ${route}`
  useEffect(() => {
    let current = true
    const timer = setTimeout(() => void read<T>(route).then((value) => { if (current) setAnswer({ key, value }) }), wait)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [key, route, wait])
  return [answer?.key === key ? answer.value : undefined, () => setAttempt((count) => count + 1)]
}
