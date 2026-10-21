import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loading } from '../../components/Loading'
import { changeAccess, statusSchema, useAccess } from '../../lib/access'
import { saidSchema, VIEWS, type ViewProps } from './address'
import { People } from './People'
import { Roles } from './Roles'
import { Services } from './Services'

const SCREENS = { people: People, roles: Roles, services: Services }
const UNFINISHED = 'That did not finish. Check the list below before trying again.'

// While people load: the view tabs' height, then a table of five rows.
export const LoadingPeople = () => <Loading label="Loading people…" className="grid gap-4">
  <Skeleton className="h-9 w-64 max-w-full" />
  <div className="grid gap-3">{Array.from({ length: 5 }, (_, row) => <div key={row} className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, cell) => <Skeleton key={cell} className="h-5" />)}</div>)}</div>
</Loading>

// The owner's screens, and an Admin's. One read of the whole status serves the views and the pages under them.
export function Owner() {
  const { data, error, reload } = useAccess('status', statusSchema)
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()
  // What the last change came to, kept with the address it led to, so it is gone on the next screen.
  const said = saidSchema.safeParse(useLocation().state).data
  const [name, ...rest] = useParams()['*']!.split('/')
  // An address that names no view shows People.
  const named = VIEWS.find(item => item.name === name)
  const view = named ?? VIEWS[0]
  const Screen = SCREENS[view.name]
  const save: ViewProps['save'] = async (path, body, done = { text: path === 'retry' ? 'Checked again.' : 'Saved.' }) => {
    setPending(true)
    let result = { failed: false, ...done }
    try { await changeAccess(path, body) }
    // The save may have landed: the list below is read again, so nothing is sent twice.
    catch { result = { text: UNFINISHED, failed: true } }
    void navigate(view.home, { replace: true, state: result }); reload(); setPending(false)
  }
  return <>
    {!data && !error && <LoadingPeople />}
    {error && <><p role="alert">Access is unavailable.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry</Button></>}
    {data && <Screen status={data} id={named ? rest.join('/') : ''} view={view} pending={pending} said={said} save={save} reload={reload} />}
  </>
}
