import type { Skill } from '../../lib/access'
import type { ViewProps } from './address'
import { Group } from './Fields'
import { needLabels } from './levels'
import { Page } from './Page'
import { runners } from './subjects'

/** One skill, to read: what it needs, who can run it, and for everyone else what they lack. The owner always can.
 *  Nothing is given here: a line says where. The mark and the bold words carry a gap, never colour alone. */
export function SkillPage({ skill, ...props }: ViewProps & { skill: Skill }) {
  const { status } = props
  const list = runners(status, skill)
  const unable = list.filter(({ lacking }) => lacking.length > 0)
  return <Page {...props} name={skill.title}>
    <p>Needs {needLabels(status, skill).join(', ')}</p>
    <Group legend="Can run">
      <ul className="grid gap-1" aria-label="Can run">
        <li className="wrap-anywhere">{status.viewer.owner ? 'You' : status.ownerEmail}</li>
        {list.filter(({ lacking }) => !lacking.length).map(({ subject }) => <li className="wrap-anywhere" key={subject.kind + subject.id}>{subject.label}</li>)}
      </ul>
    </Group>
    <Group legend="Can't yet">
      {unable.length > 0 && <ul className="grid gap-1" aria-label="Can't yet">{unable.map(({ subject, lacking }) =>
        <li className="border-s-[0.2rem] border-primary ps-2.5 font-semibold wrap-anywhere" key={subject.kind + subject.id}>
          <span aria-hidden="true">! </span>{subject.label}: {lacking.join(', ')}
        </li>)}</ul>}
      {!unable.length && <p>Nobody: everyone here can run it</p>}
    </Group>
    <p className="text-muted-foreground">Open a person or role to give it.</p>
  </Page>
}
