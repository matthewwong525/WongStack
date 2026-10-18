import type { ReactNode } from 'react'
import { useLocation, useParams } from 'react-router'
import { Card } from '@/components/ui/card'
import type { Level } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { at, saidSchema, VIEWS } from './address'
import { Labels } from './Labels'
import { levelLabel } from './levels'
import { useServers } from './mcp'
import { Notice } from './Notices'
import { Services } from './Services'
import { Switch } from './View'

type Held = { apps: string[]; keys: { id: string; title: string; level: Level }[] }

/** What a person who manages nothing can use: a label per app, by its title, and one per saved key with their level.
 *  An app has no level: all of it is theirs. Access itself is everyone's, so it is not named. */
function Own({ apps, keys }: Held) {
  return <section aria-labelledby="access-own" className="min-w-0"><Card className="gap-2 p-4 wrap-anywhere">
    <h2 id="access-own">You can use</h2>
    <Labels title="Apps" items={apps.filter(app => app !== 'access').map(appTitle)} none="No apps yet. Ask your employer." />
    <Labels title="Keys" items={keys.map(key => levelLabel(key.title, key.level))} />
  </Card></section>
}

// A teammate's two views: what they can use, which opens first, and Services, where they connect their own MCPs.
const YOURS = { name: 'yours', title: 'Your access', home: at() }
const TEAMMATE = [YOURS, VIEWS[2]] as const

/** Access for a person who manages nothing: the switch between their two views, the last change, then the view. */
export function Teammate(props: Held) {
  const mcp = useServers()
  const said = saidSchema.safeParse(useLocation().state).data
  const [name, ...rest] = useParams()['*']!.split('/')
  const view = name === 'services' ? VIEWS[2] : YOURS
  const frame = (add: ReactNode, body: ReactNode) => <section aria-label={view.title} className="grid min-w-0 gap-4">
    <Switch views={TEAMMATE} view={view} counts={{ services: mcp.data?.servers.length }} add={add} />
    {said && <Notice role={said.failed ? 'alert' : 'status'}><p><strong>{said.text}</strong></p></Notice>}
    {body}
  </section>
  return view === YOURS ? frame(null, <Own {...props} />) : <Services mcp={mcp} id={rest.join('/')} frame={frame} />
}
