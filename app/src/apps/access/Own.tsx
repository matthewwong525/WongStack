import { Card } from '@/components/ui/card'
import type { Level } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { Labels } from './Labels'
import { dots, levelLabel, reachLabel } from './levels'

type Held = { id: string; title: string; level: Level }

/** What a person who manages nothing can use: a label per area with their level, a screen or not, and one per saved
 *  key. Before permissions start there are no levels yet: every app, by name. Access itself is everyone's. */
export function Own({ apps, areas, keys }: { apps: string[]; areas?: (Held & { screen: boolean })[]; keys: Held[] }) {
  const mine = areas?.map(area => dots(reachLabel(area.title, area.level), !area.screen && 'No screen')) ?? apps.filter(app => app !== 'access').map(appTitle)
  return <section aria-labelledby="access-own" className="min-w-0"><Card className="gap-2 p-4 wrap-anywhere">
    <h2 id="access-own">You can use</h2>
    <Labels title="Apps" items={mine} none="No apps yet. Ask your employer." />
    <Labels title="Keys" items={keys.map(key => levelLabel(key.title, key.level))} />
  </Card></section>
}
