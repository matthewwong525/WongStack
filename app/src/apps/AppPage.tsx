import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loading } from '../components/Loading'
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
  if (!data) return <Loading label="Loading app access…" className="grid gap-4"><Skeleton className="h-8 w-48 max-w-full" /><Skeleton className="h-40 rounded-xl" /></Loading>
  if (data.state === 'current' && !data.apps.includes(name)) return <Stopped><h1>App access denied</h1><p>Contact your employer to use this app.</p><a href="/">Go home</a></Stopped>
  return page
}
