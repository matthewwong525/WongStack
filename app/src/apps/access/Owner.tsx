import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { changeAccess, statusSchema, useAccess } from '../../lib/access'
import { saidSchema, VIEWS, type ViewProps } from './address'
import { Apps } from './Apps'
import { Keys } from './Keys'
import { People } from './People'
import { Roles } from './Roles'

const SCREENS = { people: People, roles: Roles, apps: Apps, keys: Keys }
const UNFINISHED = 'That did not finish. Check the list below before trying again.'

// The owner's screens, and a manager's. One read of the whole status serves the four views and the pages under them.
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
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry</Button></>}
    {data && <Screen status={data} id={named ? rest.join('/') : ''} view={view} pending={pending} said={said} save={save} reload={reload} />}
  </>
}
