import type { Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { LevelChoice } from './LevelChoice'
import { heldUseLine, shortLine, ticked, usesLine, type AccessSet } from './levels'

/** The ticks and levels of one set, a person's own or a role's. `unused` is the line for a level nothing ticked uses. */
export function SetFields({ status, set, unused, onChange }: { status: Status; set: AccessSet; unused: string; onChange: (set: AccessSet) => void }) {
  return <>
    <fieldset><legend>Apps</legend>
      {status.apps.map(app => <div className="access-app" key={app}>
        <label className="access-choice">
          <input type="checkbox" checked={set.apps.includes(app)} onChange={event => onChange(ticked(status, set, app, event.target.checked))} />
          {appTitle(app)}
        </label>
        <p className="access-muted">{usesLine(status, app)}</p>
        {set.apps.includes(app) && <p className="access-muted">{shortLine(status, app, set.keys)}</p>}
      </div>)}
      {!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}
    </fieldset>
    <fieldset><legend>Keys</legend>
      {status.keys.map(key => <LevelChoice key={key.id} legend={key.title} levels={key.levels} value={set.keys[key.id] ?? null}
        note={heldUseLine(key, set.apps, unused)} onChange={level => onChange({ ...set, keys: { ...set.keys, [key.id]: level } })} />)}
      {!status.keys.length && <p>No keys saved yet.</p>}
    </fieldset>
  </>
}
