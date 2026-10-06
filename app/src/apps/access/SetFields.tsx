import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Level, Status } from '../../lib/access'
import { Group, Tick } from './Fields'
import { LevelChoice } from './LevelChoice'
import { ProjectStep } from './ProjectStep'
import { appStart, gaps, keyLine, lines, missing, opensLine, raised, reachName, type AccessSet, type Needs } from './levels'

const AREA_LEVELS: Level[] = ['read', 'write']
/** One press of a starting point: the set, and the lines marked new, as they were just before it. */
type Pick = { id: string; before: AccessSet; marked: string[] }

/** One set, a person's own or a role's, in three parts. Start from: each app and skill, which fills in what it
 *  needs on a press. Can reach: the one list the app enforces, a level per area and per key, changed by hand too.
 *  Project code is one tick of its own after it, with the step left under it while the app can not hand the
 *  project out. Can't yet: each app and skill the set has and can't fully use, with what would let it. Nothing
 *  here saves. */
export function SetFields({ status, set, onChange }: { status: Status; set: AccessSet; onChange: (set: AccessSet) => void }) {
  // The starting points pressed, in order, and the lines one of them raised: those stay marked until the save.
  const [picked, setPicked] = useState<Pick[]>([])
  const [fresh, setFresh] = useState<string[]>([])
  const starts = [...status.areas.filter(area => area.screen).map(area => ({ id: `app:${area.id}`, title: area.title, needs: appStart(status, area.id) })),
    ...status.skills.map(skill => ({ id: `skill:${skill.id}`, title: skill.title, needs: skill }))]
  const short = gaps(status, set)
  const fill = (id: string, needs: Needs) => {
    const made = lines(missing(set, needs))
    setPicked([...picked, { id, before: set, marked: fresh }]); setFresh([...fresh, ...made]); onChange(raised(set, needs))
  }
  // Pressed again, a starting point takes back what it filled, and whatever was started after it: the set and
  // its marks go back to what they were, so a line an earlier press raised stays marked.
  const press = (id: string, needs: Needs) => {
    const at = picked.findIndex(pick => pick.id === id)
    if (at < 0) return fill(id, needs)
    setPicked(picked.slice(0, at)); setFresh(picked[at].marked); onChange(picked[at].before)
  }
  // A level changed by hand is the owner's own: no starting point is marked as the whole of it any more.
  const change = (line: string, next: AccessSet) => { setPicked([]); setFresh(fresh.filter(item => item !== line)); onChange(next) }
  const mark = (line: string) => fresh.includes(line) && 'new'
  // Project code is Read or nothing, so it is a tick: the same choice as its level in Keys.
  const project = status.keys.some(key => key.id === 'code')
  const installs = set.keys.code === 'read'
  return <>
    <Group legend="Start from">
      {starts.length > 0 && <div className="flex flex-wrap gap-2">{starts.map(start => {
        const on = picked.some(pick => pick.id === start.id)
        return <Button type="button" size="sm" variant={on ? 'secondary' : 'outline'} aria-pressed={on} key={start.id} onClick={() => press(start.id, start.needs)}>
          {start.title}{on && <span aria-hidden="true"> ✓</span>}
        </Button>
      })}</div>}
      <p className="text-sm text-muted-foreground">{starts.length ? 'A press fills in what it needs below. Nothing is saved until you save.' : 'No apps or skills yet. Ask your assistant to make one.'}</p>
    </Group>
    <Group legend="Can reach">
      {status.areas.map(area => <LevelChoice key={area.id} legend={area.title} names={reachName} levels={AREA_LEVELS} value={set.apps[area.id] ?? null} mark={mark(`app:${area.id}`)}
        notes={[opensLine(status, set, area)]} onChange={level => change(`app:${area.id}`, { ...set, apps: { ...set.apps, [area.id]: level } })} />)}
      {status.keys.filter(key => key.id !== 'code').map(key => <LevelChoice key={key.id} legend={key.title} levels={key.levels} value={set.keys[key.id] ?? null} mark={mark(`key:${key.id}`)}
        notes={[keyLine(status, set, key)]} onChange={level => change(`key:${key.id}`, { ...set, keys: { ...set.keys, [key.id]: level } })} />)}
      {!status.areas.length && <p>No apps built yet. Ask your assistant to make one.</p>}
      {!status.keys.length && <p>No keys saved yet.</p>}
    </Group>
    {project && <Group legend="Project">
      <div className="flex flex-wrap items-center gap-2.5">
        <Tick checked={installs} onChange={to => change('key:code', { ...set, keys: { ...set.keys, code: to ? 'read' : null } })}>Can install the project</Tick>
        {mark('key:code') && <strong className="text-sm font-semibold">new</strong>}
      </div>
      <p className="text-sm text-muted-foreground">Puts the project on their computer, to read and use.</p>
      {installs && <ProjectStep status={status} />}
    </Group>}
    <Group legend="Can't yet">
      {short.map(gap => <div className="grid justify-items-start gap-1.5 border-s-[0.2rem] border-primary ps-2.5" key={gap.id}>
        <p className="font-semibold wrap-anywhere"><span aria-hidden="true">! </span>{gap.line}</p>
        <Button type="button" variant="outline" size="sm" aria-label={`Give ${gap.title} what it needs`} onClick={() => fill(gap.id, gap.needs)}>Give what it needs</Button>
      </div>)}
      {!short.length && <p>Nothing: everything here can run</p>}
    </Group>
  </>
}
