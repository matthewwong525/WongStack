import { at, type ViewProps } from './address'
import { needShort } from './levels'
import { SkillPage } from './SkillPage'
import { canRun } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

// Each skill that does business work on one line: how much it needs, and how many people can run it. Its panel names what. It is a list to
// read: nobody is given a skill, only the areas and keys it needs, where a person or a role is opened. Nothing adds
// a skill by hand, so a quiet line under the list says how one is made.
export function Skills(props: ViewProps) {
  const { status, id } = props
  const opened = status.skills.find(skill => skill.id === id)
  return <View {...props}>
    <Table view={props.view} columns={['Skill', 'Needs', 'Can run']} hint="Your assistant makes skills."
      empty={!status.skills.length && <><p>No skills do business work yet.</p><p>Ask your assistant to make one.</p></>}>
      {status.skills.map(skill => {
        const page = at('skills', skill.id)
        return <Row key={skill.id} to={page} current={skill === opened}>
          <Name title={skill.title} to={page} />
          <Cell label="Needs">{needShort(skill)}</Cell>
          <Cell label="Can run">{canRun(status, skill)}</Cell>
        </Row>
      })}
    </Table>
    {opened && <SkillPage key={id} {...props} skill={opened} />}
  </View>
}
