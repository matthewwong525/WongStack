import type { SavedKey, Status } from '../../lib/access'
import { Group, Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { FinishStep } from './Notices'
import { ProjectStep } from './ProjectStep'
import { keyLine, keyState, type AccessSet } from './levels'

/** What a key that is not saved yet waits for. Setup makes one key itself: on the live app the owner asks their
 *  assistant to finish, with the request to copy, and a manager is told it is the owner's step; no step can finish
 *  it on a preview. Any other key comes through its link. */
function NextStep({ status, item }: { status: Status; item: SavedKey }) {
  if (!item.setup) return <p className="text-sm">Ask your assistant for the key link.</p>
  if (status.environment !== 'live') return null
  return status.viewer.owner
    ? <FinishStep plain>Look-ups need a read-only key. Ask your assistant:</FinishStep>
    : <p className="text-sm">Look-ups need a read-only key. {status.ownerEmail} finishes that in Access setup.</p>
}

/** One set, a person's own or a role's, in two groups that don't depend on each other. Apps: a tick each, and a
 *  ticked app does everything it was built to do. Keys: a level each, for what an assistant does with the key by
 *  itself, and one line says so. Each key says beside its name whether it is saved, with the step left under it
 *  when it is not; a level can be set either way. Project code is one tick of its own after them, with the step left under it while the app can not hand
 *  the project out. Nothing here saves. */
export function SetFields({ status, set, onChange }: { status: Status; set: AccessSet; onChange: (set: AccessSet) => void }) {
  // Project code is Read or nothing, so it is a tick: the same choice as its level in Keys.
  const project = status.keys.some(key => key.id === 'code')
  const installs = set.keys.code === 'read'
  return <>
    <Group legend="Apps">
      {status.apps.map(app => <Tick key={app.id} checked={set.apps.includes(app.id)}
        onChange={on => onChange({ ...set, apps: on ? [...set.apps, app.id] : set.apps.filter(id => id !== app.id) })}>{app.title}</Tick>)}
      {!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}
    </Group>
    <Group legend="Keys">
      <p className="text-sm text-muted-foreground">For using a key by itself. Apps need no level.</p>
      {status.keys.filter(key => key.id !== 'code').map(key => <LevelChoice key={key.id} legend={key.title} state={keyState(key, status.environment)}
        levels={key.levels} value={set.keys[key.id] ?? null} notes={[keyLine(key)]} onChange={level => onChange({ ...set, keys: { ...set.keys, [key.id]: level } })}>
        {!key.saved && <NextStep status={status} item={key} />}
      </LevelChoice>)}
      {!status.keys.length && <p>No keys saved yet.</p>}
    </Group>
    {project && <Group legend="Project">
      <Tick checked={installs} onChange={to => onChange({ ...set, keys: { ...set.keys, code: to ? 'read' : null } })}>Can install the project</Tick>
      {installs && <ProjectStep status={status} />}
    </Group>}
  </>
}
