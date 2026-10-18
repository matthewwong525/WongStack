import { Card } from '@/components/ui/card'
import type { Level } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { Labels } from './Labels'
import { levelLabel } from './levels'

/** What a person who manages nothing can use: a label per app, by its title, and one per saved key with their level.
 *  An app has no level: all of it is theirs. Access itself is everyone's, so it is not named. */
export function Own({ apps, keys }: { apps: string[]; keys: { id: string; title: string; level: Level }[] }) {
  return <section aria-labelledby="access-own" className="min-w-0"><Card className="gap-2 p-4 wrap-anywhere">
    <h2 id="access-own">You can use</h2>
    <Labels title="Apps" items={apps.filter(app => app !== 'access').map(appTitle)} none="No apps yet. Ask your employer." />
    <Labels title="Keys" items={keys.map(key => levelLabel(key.title, key.level))} />
  </Card></section>
}
