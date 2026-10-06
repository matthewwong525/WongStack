import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { NotFound } from '../pages/not-found/NotFound'
import { appAccessSchema, useAccess } from '../lib/access'
import { appPage } from '.'

const Stopped = ({ children }: { children: ReactNode }) => <div className="grid justify-items-start gap-4">{children}</div>

// The page of the mini app the address names, /apps/<name>/, or Page not found.
export function AppPage() {
  const name = useParams().name!
  const page = appPage(name)
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  if (!page) return <NotFound />
  if (error) return <Stopped><h1>App access unavailable</h1><Button type="button" variant="outline" onClick={reload}>Retry access</Button></Stopped>
  if (!data) return <p role="status">Loading app access…</p>
  if (data.state === 'current' && !data.apps.includes(name)) return <Stopped><h1>App access denied</h1><p>Contact your employer to use this app.</p><a href="/">Go home</a></Stopped>
  return page
}
