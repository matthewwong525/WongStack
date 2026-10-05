import type { Level } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { dots, levelName } from './levels'

/** What the signed-in person can use: their apps, and their level for each saved key. Access itself is everyone's. */
export function Own({ apps, keys }: { apps: string[]; keys: { id: string; title: string; level: Level }[] }) {
  return <section aria-labelledby="access-own" className="access-notice">
    <h2 id="access-own">You can use</h2>
    <p>{dots(...apps.filter(app => app !== 'access').map(appTitle)) || 'No apps yet. Ask your employer.'}</p>
    <p className="access-muted">{dots(...keys.map(key => `${key.title}: ${levelName(key.level)}`))}</p>
  </section>
}
