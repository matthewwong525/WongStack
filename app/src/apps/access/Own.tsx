import type { Level } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { Labels } from './Labels'
import { levelLabel } from './levels'

/** What a person who manages nothing can use: a label per app, and one per saved key with their level. Access itself is everyone's. */
export function Own({ apps, keys }: { apps: string[]; keys: { id: string; title: string; level: Level }[] }) {
  return <section aria-labelledby="access-own" className="access-notice access-own">
    <h2 id="access-own">You can use</h2>
    <Labels title="Apps" items={apps.filter(app => app !== 'access').map(appTitle)} none="No apps yet. Ask your employer." />
    <Labels title="Keys" items={keys.map(key => levelLabel(key.title, key.level))} />
  </section>
}
