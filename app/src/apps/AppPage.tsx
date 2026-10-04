import { useParams } from 'react-router'
import { NotFound } from '../pages/not-found/NotFound'
import { appAccessSchema, useAccess } from '../lib/access'
import { appPage } from '.'

// The page of the mini app the address names, /apps/<name>/, or Page not found.
export function AppPage() {
  const name = useParams().name!
  const page = appPage(name)
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  if (!page) return <NotFound />
  if (error) return <><h1>App access unavailable</h1><button type="button" onClick={reload}>Retry access</button></>
  if (!data) return <p role="status">Loading app access…</p>
  if (data.state === 'current' && !data.apps.includes(name)) return <><h1>App access denied</h1><p>Contact your employer to use this app.</p><a href="/">Go home</a></>
  return page
}
