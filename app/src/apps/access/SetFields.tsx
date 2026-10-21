import type { Person, SavedKey, Status } from '../../lib/access'
import { Group, Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { FinishStep } from './Notices'
import { ProjectStep } from './ProjectStep'
import { WelcomeFold } from './Welcome'
import { keyLine, keyState, type AccessSet } from './levels'

/** What a key that is not saved yet waits for. Setup makes one key itself: the owner copies a request, an Admin is
 *  told it is the owner's step, and a preview has no step. Any other key comes through its link. */
function NextStep({ status, item }: { status: Status; item: SavedKey }) {
  if (!item.setup) return <p className="text-sm">Ask your assistant for the key link.</p>
  if (status.environment !== 'live') return null
  return status.viewer.owner
    ? <FinishStep plain>Look-ups need a read-only key. Ask your assistant:</FinishStep>
    : <p className="text-sm">Look-ups need a read-only key. {status.ownerEmail} finishes that in Access setup.</p>
}

/** One set, a person's own or a role's: a tick per app, and a level per key, saved or not. Project code is one tick of
 *  its own after them; for a saved, active `person` it folds out the message to send them. Nothing here saves. */
export function SetFields({ status, set, onChange, person }: { status: Status; set: AccessSet; onChange: (set: AccessSet) => void; person?: Person }) {
  // Project code is two ticks: Read installs and saves, Write also publishes, so publishing needs the install tick.
  const project = status.keys.find(key => key.id === 'code')
  const installs = set.keys.code === 'read' || set.keys.code === 'write'
  const code = (level: 'read' | 'write' | null) => onChange({ ...set, keys: { ...set.keys, code: level } })
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
      <Tick checked={installs} onChange={to => code(to ? 'read' : null)}>Can install the project</Tick>
      <p className="text-sm text-muted-foreground">They can save changes too.</p>
      {person?.status === 'active' && installs && status.project === 'ready' && <WelcomeFold status={status} person={{ email: person.email, role: null, keys: set.keys }} />}
      {project.levels.includes('write') && <>
        <Tick checked={set.keys.code === 'write'} disabled={!installs} onChange={to => code(to ? 'write' : 'read')}>Can publish</Tick>
        <p className="text-sm text-muted-foreground">Their changes go live once the checks pass.</p>
      </>}
      {(installs || status.project === 'live') && <ProjectStep status={status} />}
    </Group>}
  </>
}
