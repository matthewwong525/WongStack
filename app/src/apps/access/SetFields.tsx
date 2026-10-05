import type { SavedKey, Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { Group, Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { appUses, hint, ticked, usesShort, type AccessSet } from './levels'

const ALONE = 'look-ups, no app needed'

/** The ticks and levels of one set, a person's own or a role's. A ticked app shows the level of each key it uses
 *  right under it; the keys no ticked app uses follow in a group of their own. */
export function SetFields({ status, set, onChange }: { status: Status; set: AccessSet; onChange: (set: AccessSet) => void }) {
  const on = (app: string) => set.apps.includes(app)
  // The ticked apps that use a key. A level is the key's, so two of them show the same one.
  const users = (key: SavedKey) => key.usedBy.filter(use => on(use.app)).map(use => use.app)
  const choice = (key: SavedKey, notes: string[]) => <LevelChoice key={key.id} legend={key.title} levels={key.levels} value={set.keys[key.id] ?? null}
    notes={notes} onChange={level => onChange({ ...set, keys: { ...set.keys, [key.id]: level } })} />
  const rest = status.keys.filter(key => !users(key).length)
  return <>
    <Group legend="Apps">
      {status.apps.map(app => {
        const uses = appUses(status, app)
        const open = on(app) && uses.length > 0
        return <div role="group" aria-label={appTitle(app)} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5" key={app}>
          <Tick checked={on(app)} onChange={to => onChange(ticked(status, set, app, to))}>{appTitle(app)}</Tick>
          {!open && <span className="text-sm text-muted-foreground">{usesShort(status, app)}</span>}
          {open && <div className="ms-2.5 grid min-w-0 basis-full gap-3 border-s-2 ps-4">{uses.map(({ key, need }) => {
            const others = users(key).filter(other => other !== app).map(appTitle).join(', ')
            return choice(key, [hint(app, key, need, set.keys[key.id]), others && `One level, shared with ${others}`, key.alone ? ALONE : ''])
          })}</div>}
        </div>
      })}
      {!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}
    </Group>
    {(rest.length > 0 || !status.keys.length) && <Group legend="Keys no ticked app uses">
      {rest.map(key => choice(key, [key.alone ? ALONE : '']))}
      {!status.keys.length && <p>No keys saved yet.</p>}
    </Group>}
  </>
}
