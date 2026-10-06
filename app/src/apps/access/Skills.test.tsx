// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { App } from './App'
import type { Person, SavedKey, Status } from '../../lib/access'

// The Skills view and a skill's panel, and what skills and an area with no screen add to the People and Apps lists.
// A shop with two apps and one area with no screen: Orders changes things with Stripe, Hello uses no key, and Sample
// records exists for skills alone. Refund a customer changes orders, needs Stripe at Read & write and Project code;
// the weekly summary only looks up sample records.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: {}, keys: {}, ...changes })
// Everything a refund needs: what the Sales role gives, and so what its holders are sent with.
const sales = () => ({ apps: { orders: 'write' as const }, keys: { stripe: 'write' as const, code: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, appKeys: { orders: [{ id: 'stripe', need: 'write' }], hello: [], sample: [] },
  areas: [{ id: 'orders', title: 'Orders', description: 'Look up an order and refund it.', screen: true }, { id: 'hello', title: 'Hello', description: 'A small example.', screen: true },
    { id: 'sample', title: 'Sample records', description: 'Made-up records for a skill to read.', screen: false }],
  skills: [{ id: 'refund', title: 'Refund a customer', areas: { orders: 'write' }, keys: { stripe: 'write', code: 'read' } }, { id: 'report', title: 'Weekly summary', areas: { sample: 'read' }, keys: {} }],
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'orders', need: 'write' }] }), key('code', 'Project code', { levels: ['read'], alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: {}, keys: {} }, { id: 'sales', name: 'Sales', ...sales() }],
  // Kim holds everything both skills need. Bo is short of an area's level, Ann of a key's level, and Pat of Project code alone.
  people: [person('gone@shop.com', { status: 'removed', ...sales() }), person('kim@shop.com', { apps: { orders: 'write', sample: 'read' }, keys: { stripe: 'write', code: 'read' } }),
    person('bo@shop.com', { apps: { orders: 'read' }, keys: { stripe: 'write', code: 'read' } }), person('ann@shop.com', { apps: { orders: 'write' }, keys: { stripe: 'read', code: 'read' } }),
    person('pat@shop.com', { apps: { orders: 'write' }, keys: { stripe: 'write' } }), person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [], project: 'ready' })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  roster = status()
  fetchMock = vi.fn(async (url: string) => {
    // The owner, or a manager: an employee who manages. The status names which in `viewer`.
    if (url.endsWith('/apps')) return Response.json({ state: 'current', role: roster.viewer.owner ? 'owner' : 'employee', manages: true, apps: ['access', 'orders', 'hello'], revision: 1 })
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
// The address bar: it shows where the screen is, and a click on it goes Back.
function Where() {
  const navigate = useNavigate()
  return <button type="button" data-testid="where" onClick={() => void navigate(-1)}>{useLocation().pathname}</button>
}
const open = (path = '') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Where /><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const where = () => screen.getByTestId('where').textContent
const back = () => fireEvent.click(screen.getByTestId('where'))
const follow = (name: string) => fireEvent.click(screen.getByRole('link', { name }))
const sends = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
// The five views in the switch, each with its count, and the one that is open.
const tabs = () => within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)
const current = () => Array.from(document.querySelectorAll('[aria-current="page"]')).map(link => link.textContent)
// One list, by its view's name, and what each cell of each of its rows says.
const table = (name: string) => screen.findByRole('table', { name })
const rows = (list: HTMLElement) => Array.from(list.querySelectorAll('tbody tr')).map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent))
// The panel an opened item sits in, by the item's name; that no panel is open any more; and the lines of one list in a skill's panel.
const panel = (name: string) => screen.findByRole('dialog', { name })
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
const listed = (box: HTMLElement, name: string) => within(within(box).getByRole('list', { name })).getAllByRole('listitem').map(item => item.textContent)
// The panel starts listening for a press outside it a moment after it opens.
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
// A press with the pointer: the panel answers one beside it once the click lands.
const press = (on: Element) => { fireEvent.pointerDown(on); fireEvent.click(on) }
const NOBODY = 'Nobody: everyone here can run it'

it('lists each skill on one line under a fifth view: what it needs, and how many of the people who can sign in can run it', async () => {
  open('skills'); const list = await table('Skills')
  // Skills sits between Apps and Keys, counted like the others. Nobody adds a skill by hand: a quiet line under the list says how one is made.
  expect([tabs(), current()]).toEqual([['People 7', 'Roles 2', 'Apps 3', 'Skills 2', 'Keys 2'], ['Skills 2']])
  expect([screen.queryByRole('link', { name: /^Add/ }), screen.queryByRole('dialog'), screen.getByText('Your assistant makes skills.').tagName]).toEqual([null, null, 'P'])
  expect(within(list).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Skill', 'Needs', 'Can run'])
  // Needs names each area with its level, then each key with its own; Project code offers Read alone, so it is named with no level.
  // Can run counts the owner, a role's holders by what the role gives and a person by their own set, of everyone who can sign in: never a removed person.
  expect(rows(list)).toEqual([['Refund a customer', 'Orders Look up & change, Stripe Read & write, Project code', '4 of 7'], ['Weekly summary', 'Sample records Look up', '2 of 7']])
  // Each name is the link that opens the skill, and no row is marked until one is open.
  expect(within(list).getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')])).toEqual([['Refund a customer', '/apps/access/skills/refund'], ['Weekly summary', '/apps/access/skills/report']])
  expect(document.querySelector('tr[aria-current]')).toBeNull()
  // What a skill needs gives way on a narrow row, with the whole of it in its title; both cells name their column once rows stack.
  const needs = within(list).getByText('Sample records Look up')
  expect([needs.title, needs.getAttribute('data-label'), within(list).getByText('2 of 7').getAttribute('data-label')]).toEqual(['Sample records Look up', 'Needs', 'Can run'])
})
it('says in two lines that no skill does business work yet, under Skills 0, with no table and no line under one', async () => {
  roster.skills = []; open('skills'); const view = await screen.findByRole('region', { name: 'Skills' })
  expect(Array.from(view.querySelectorAll('p')).map(line => line.textContent)).toEqual(['No skills do business work yet.', 'Ask your assistant to make one.'])
  expect([tabs()[3], current(), screen.queryByRole('table'), screen.queryByText('Your assistant makes skills.')]).toEqual(['Skills 0', ['Skills 0'], null, null])
  // A skill's address opens nothing while there is none.
  cleanup(); open('skills/refund'); await screen.findByText('No skills do business work yet.'); expect(screen.queryByRole('dialog')).toBeNull()
})
it('opens a skill to read who can run it and what everyone else lacks, by area, by key and by Project code, with nothing to save', async () => {
  open('skills/refund'); const box = await panel('Refund a customer'); const inside = within(box)
  // The list stays in place beside the panel, with the open skill's row marked.
  const marked = Array.from(screen.getByRole('table', { name: 'Skills' }).querySelectorAll<HTMLElement>('tr[aria-current="true"]'))
  expect(marked.map(row => within(row).getByRole('link').textContent)).toEqual(['Refund a customer'])
  expect(inside.getByText('Needs Orders Look up & change, Stripe Read & write, Project code').tagName).toBe('P')
  // The owner comes first, as You; then a role that gives everything, with its holders, and a person whose own set does.
  expect(listed(box, 'Can run')).toEqual(['You', 'Sales · lee@shop.com, sam@shop.com', 'kim@shop.com'])
  // Everyone else, each with what they lack: a role that gives nothing lacks it all; one person an area's level, one a key's level,
  // and one Project code, named with no level. The "!" is in the words. A removed person is on neither list.
  expect(listed(box, "Can't yet")).toEqual(['! Office · nobody yet: Orders Look up & change, Stripe Read & write, Project code', '! bo@shop.com: Orders Look up & change',
    '! ann@shop.com: Stripe Read & write', '! pat@shop.com: Project code'])
  // Each list sits under its own bold name, and a line says where it is given: nothing is given here.
  for (const name of ['Can run', "Can't yet"]) expect(inside.getByRole('group', { name }).contains(inside.getByRole('list', { name })), name).toBe(true)
  expect([!!inside.getByText('Open a person or role to give it.'), inside.queryByText(NOBODY)]).toEqual([true, null])
  // The panel is only read: its one button closes it. No Save, no Cancel, no field to fill, and nothing waits to be saved.
  expect(inside.getAllByRole('button').map(button => button.textContent)).toEqual(['Close'])
  expect([box.querySelector('form, input, select, textarea'), inside.queryByText('Not saved yet'), sends()]).toEqual([null, null, []])
})
it('names the owner by email to a manager, and says nobody is left out once everyone can run a skill', async () => {
  roster.viewer = { email: 'kim@shop.com', owner: false }
  open('skills/report'); let box = await panel('Weekly summary')
  expect(within(box).getByText('Needs Sample records Look up').tagName).toBe('P')
  // A manager is not the owner: the owner is named, and the manager is listed like anyone else.
  expect(listed(box, 'Can run')).toEqual(['owner@shop.com', 'kim@shop.com'])
  expect(listed(box, "Can't yet")).toEqual(['Office · nobody yet', 'Sales · lee@shop.com, sam@shop.com', 'bo@shop.com', 'ann@shop.com', 'pat@shop.com'].map(who => `! ${who}: Sample records Look up`))
  // With only a role and a person who hold everything a refund needs, the second list is one plain line.
  cleanup(); roster.roles = roster.roles.filter(role => role.id === 'sales'); roster.people = roster.people.filter(({ email }) => ['kim@shop.com', 'lee@shop.com', 'sam@shop.com'].includes(email))
  open('skills/refund'); box = await panel('Refund a customer')
  const cannot = within(within(box).getByRole('group', { name: "Can't yet" }))
  expect([listed(box, 'Can run'), cannot.queryByRole('list'), cannot.getByText(NOBODY).tagName]).toEqual([['owner@shop.com', 'Sales · lee@shop.com, sam@shop.com', 'kim@shop.com'], null, 'P'])
  expect(rows(screen.getByRole('table', { name: 'Skills' })).map(cells => cells[2])).toEqual(['4 of 4', '2 of 4'])
  // With no role and nobody added, the owner alone can run it, and still nobody is left out.
  cleanup(); roster.viewer = { email: 'owner@shop.com', owner: true }; roster.roles = []; roster.people = []
  open('skills/refund'); box = await panel('Refund a customer')
  expect([listed(box, 'Can run'), !!within(box).getByText(NOBODY), rows(screen.getByRole('table', { name: 'Skills' })).map(cells => cells[2])]).toEqual([['You'], true, ['1 of 1', '1 of 1']])
})
it("closes a skill's panel at once by its ✕, Escape or a press on the page beside it, back to Skills, and Back and a reload keep the place", async () => {
  const ways = [() => fireEvent.click(screen.getByRole('button', { name: 'Close' })), () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }), () => press(screen.getByRole('heading', { name: 'Access' }))]
  for (const [at, close] of ways.entries()) {
    // A reload at the skill's own address opens it again.
    open('skills/refund'); const box = await panel('Refund a customer'); await moment()
    // A press inside the panel leaves it open, and so does the keyboard moving to the page beside it.
    press(box); fireEvent.focusIn(screen.getByRole('link', { name: 'People 7' })); await moment()
    expect([screen.getAllByRole('dialog'), where()], `${at}`).toEqual([[box], '/apps/access/skills/refund'])
    // Nothing can be changed in it, so nothing asks: it closes, and the list is still there with no row marked.
    close(); await closed()
    expect([where(), screen.queryByRole('alertdialog'), document.querySelector('tr[aria-current]'), rows(screen.getByRole('table', { name: 'Skills' })).length], `${at}`).toEqual(['/apps/access/skills', null, null, 2]); cleanup()
  }
  // From the list, a skill's name opens it at its own address. A press on another row beside the open panel is that row's own: it opens that skill instead.
  fetchMock.mockClear(); open('skills'); fireEvent.click(await screen.findByRole('link', { name: 'Refund a customer' }))
  await panel('Refund a customer'); expect(where()).toBe('/apps/access/skills/refund'); await moment()
  press(within(screen.getByRole('table', { name: 'Skills' })).getByText('2 of 7')); const report = await panel('Weekly summary')
  expect([screen.getAllByRole('dialog'), where(), listed(report, 'Can run')]).toEqual([[report], '/apps/access/skills/report', ['You', 'kim@shop.com']])
  // Back returns to the skill before, then to the list.
  back(); await panel('Refund a customer'); expect(where()).toBe('/apps/access/skills/refund')
  back(); await closed(); expect([where(), current()]).toEqual(['/apps/access/skills', ['Skills 2']])
  // Another view's link leaves an open skill without asking.
  follow('Weekly summary'); await panel('Weekly summary'); follow('People 7'); await table('People')
  expect([where(), screen.queryByRole('dialog'), screen.queryByRole('alertdialog')]).toEqual(['/apps/access/', null, null])
  // One read of the status served every step, and nothing was sent.
  expect([fetchMock.mock.calls.filter(([url]) => url.endsWith('/status')).length, sends()]).toEqual([1, []])
  // An address that names no skill shows the list with no panel.
  cleanup(); open('skills/nothing'); expect(rows(await table('Skills'))).toHaveLength(2); expect([screen.queryByRole('dialog'), current()]).toEqual([null, ['Skills 2']])
})
it('lists an area with no screen among the apps, marked No screen and counted with them, and says when no app is built yet', async () => {
  open('apps'); const list = await table('Apps')
  // The mark is in words beside the name, and who has the area is counted as for an app.
  expect(tabs()[2]).toBe('Apps 3')
  expect(rows(list)).toEqual([['Orders', 'Stripe: look up, change', 'Owner, 1 role, 4 people'], ['Hello', 'No keys', 'Owner'], ['Sample records No screen', 'No keys', 'Owner, 1 person']])
  const name = within(list).getByRole('link', { name: 'Sample records' }); const marks = within(list).getAllByText('No screen')
  expect([name.getAttribute('href'), marks.length, marks[0].tagName, name.contains(marks[0]), name.closest('td')!.contains(marks[0])]).toEqual(['/apps/access/apps/sample', 1, 'SPAN', false, true])
  expect(screen.getByText('Ask your assistant to build an app.').tagName).toBe('P')
  // It opens like an app, and its panel says first that it has no screen.
  fireEvent.click(name); expect(within(await panel('Sample records')).getByText('No screen · Uses no keys').tagName).toBe('P'); expect(where()).toBe('/apps/access/apps/sample')
  // With no area at all, one line says so in the table's place, with no line under it.
  cleanup(); roster.areas = []; open('apps'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect([tabs()[2], screen.queryByRole('table'), screen.queryByText('Ask your assistant to build an app.')]).toEqual(['Apps 0', null, null])
})
it("counts an area with no screen as an app on a person's row, and as a gap each skill they hold every area for and can't run yet", async () => {
  // Dee holds an area no skill calls.
  roster.people.push(person('dee@shop.com', { apps: { hello: 'write' } }))
  open(); const list = await table('People')
  const summary = (email: string) => within(list).getByRole('link', { name: email }).closest('tr')!.querySelectorAll<HTMLElement>('td')[3]
  // Kim's two areas are two apps, one of them with no screen, and she can run both skills: no gap.
  // Bo holds the area a refund calls a level short, and Pat holds all of it but Project code: for each the skill is the only gap.
  // Ann's key is a level short for the Orders app and for the refund: two gaps. A skill none of whose areas a person holds is no gap of theirs.
  expect(['kim@shop.com', 'bo@shop.com', 'pat@shop.com', 'ann@shop.com', 'dee@shop.com', 'lee@shop.com'].map(email => summary(email).textContent))
    .toEqual(['2 apps, 2 keys', '1 app, 2 keys ! 1 gap', '1 app, 1 key ! 1 gap', '1 app, 2 keys ! 2 gaps', '1 app', '1 app, 2 keys'])
  // The gap is bold, and the "!" is in the text itself.
  const gap = within(summary('bo@shop.com')).getByText('1 gap'); expect([gap.tagName, gap.textContent]).toEqual(['STRONG', '! 1 gap'])
  // Opened, the person's panel names the skill and what it still needs.
  follow('bo@shop.com'); expect(within(await panel('bo@shop.com')).getByText('Refund a customer: Orders Look up & change').textContent).toBe('! Refund a customer: Orders Look up & change')
})
