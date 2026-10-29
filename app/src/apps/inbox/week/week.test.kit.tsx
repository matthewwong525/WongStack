// The week board's test kit: a made-up Inbox server with the Worker's landing rules, and the moves a person makes.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, vi } from 'vitest'
import {
  orderTasks, parseTaskTitle, positionForBandEdge, positionForIndex, shiftWeek, taskBand, taskSlots,
  type BacklogGroup, type Task, type TaskSlot, type WeekPlan,
} from '@/lib/board'
import { App } from '../App'
import '../line.test.kit'

/** A Wednesday, so the week has days on both sides of it. */
export const DAY = '2026-10-28'
export const WEEK = '2026-10-26'
type Body = Record<string, never>
type Gate = { release: () => Promise<void> }

export const fake = {
  tasks: [] as Task[],
  groups: [] as BacklogGroup[],
  goals: {} as Record<string, string>,
  online: true as boolean | 403 | 500,
  /** The next request whose `METHOD route` starts with this fails once. */
  fail: null as string | null,
  /** The next request whose `METHOD route` starts with this waits until its gate opens. */
  hold: null as { on: string; gate: Promise<void> } | null,
  calls: [] as Array<{ method: string; route: string; body: Body | null }>,
}

/** Holds the next matching request; `release` lets it go on. */
export function hold(on: string): Gate {
  let release = () => {}
  fake.hold = { on, gate: new Promise<void>(resolve => { release = resolve }) }
  return { release: () => act(async () => { release() }) }
}

export const task = (title: string, more: Partial<Task> = {}): Task => {
  const parsed = parseTaskTitle(title)
  const slot = more.slot ?? 'wed'
  const made: Task = { id: `task_${fake.tasks.length + 1}`, title: parsed.title, status: 'open', week: slot === 'backlog' ? null : WEEK,
    slot, backlogGroupId: slot === 'backlog' ? 'backlog_other' : null, position: (fake.tasks.length + 1) * 1000,
    estimateHours: parsed.estimateHours, importKey: null, link: null, chat: null, createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z', ...more }
  fake.tasks.push(made)
  return made
}

const json = (payload: unknown, status = 200) => Response.json(payload, { status })
const home = (row: Task, other: Task) => row.slot === other.slot && (row.slot === 'backlog'
  ? row.backlogGroupId === other.backlogGroupId : row.week === other.week)

function planFor(week: string): WeekPlan {
  const slots = Object.fromEntries(taskSlots.map(slot => [slot, [] as Task[]])) as WeekPlan['slots']
  for (const each of orderTasks(fake.tasks)) if (each.week === week || each.slot === 'backlog') slots[each.slot].push({ ...each })
  return { week, goal: fake.goals[week] ?? '', backlogGroups: fake.groups.map(group => ({ ...group })), slots }
}

function change(row: Task, body: Body) {
  const before = row.status
  if (body.title !== undefined) Object.assign(row, parseTaskTitle(body.title))
  if (body.status !== undefined) row.status = body.status
  if (body.slot !== undefined) {
    row.slot = body.slot as TaskSlot
    row.week = row.slot === 'backlog' ? null : body.week
    row.backlogGroupId = row.slot === 'backlog' ? body.backlogGroupId : row.backlogGroupId
  } else if (body.backlogGroupId !== undefined) row.backlogGroupId = body.backlogGroupId
  if (body.week !== undefined && body.slot === undefined) row.week = body.week
  const others = orderTasks(fake.tasks.filter(each => each !== row && home(each, row)))
  const band = taskBand(row.status)
  if (body.index !== undefined) row.position = positionForIndex(others, body.index, band) ?? positionForBandEdge(others, band, 'end')
  else if (body.slot !== undefined || body.status !== undefined) {
    row.position = positionForBandEdge(others, band, before === 'in_progress' && row.status === 'open' ? 'start' : 'end')
  }
  return json({ task: row })
}

function taskRoute(method: string, url: URL, body: Body) {
  if (method === 'POST') {
    const slot = body.slot as TaskSlot
    const made: Task = { ...task(body.title, { slot, week: slot === 'backlog' ? null : body.week,
      backlogGroupId: slot === 'backlog' ? body.backlogGroupId ?? 'backlog_other' : null }) }
    const row = fake.tasks.at(-1)!
    row.position = positionForBandEdge(fake.tasks.filter(each => each !== row && home(each, row)), 1, 'end')
    return json({ task: { ...made, position: row.position } })
  }
  if (method === 'DELETE') {
    fake.tasks = fake.tasks.filter(each => each.id !== url.searchParams.get('id'))
    return json({ id: url.searchParams.get('id') })
  }
  return change(fake.tasks.find(each => each.id === body.id)!, body)
}

function groupRoute(method: string, route: string, url: URL, body: Body) {
  if (route === 'group-move') {
    const moving = fake.groups.find(group => group.id === body.id)!
    const rest = fake.groups.filter(group => group !== moving)
    rest.splice(body.index, 0, moving)
    fake.groups = rest.map((group, at) => ({ ...group, position: (at + 1) * 1000 }))
    return json({ groups: fake.groups })
  }
  if (method === 'POST') {
    const group = { id: `group_${fake.groups.length}`, name: body.name, position: fake.groups.length * 1000 + 1000, isDefault: false }
    fake.groups.push(group)
    return json({ group })
  }
  if (method === 'PATCH') {
    const group = fake.groups.find(each => each.id === body.id)!
    group.name = body.name
    return json({ group })
  }
  const id = url.searchParams.get('id')
  fake.groups = fake.groups.filter(group => group.id !== id)
  for (const each of fake.tasks) if (each.backlogGroupId === id) each.backlogGroupId = 'backlog_other'
  return json({ plan: planFor(url.searchParams.get('week')!) })
}

function sweep(body: Body) {
  for (const each of fake.tasks.filter(row => row.week === body.week && row.slot !== 'backlog' && row.status !== 'done')) {
    if (body.to === 'next_week') each.week = shiftWeek(body.week, 1)
    else Object.assign(each, { slot: 'backlog', week: null, backlogGroupId: each.backlogGroupId ?? 'backlog_other' })
  }
  return json({ plan: planFor(body.week) })
}

function answer(method: string, route: string, url: URL, body: Body): Response {
  if (route === 'items') return typeof fake.online === 'number' ? json({}, fake.online) : json({ items: [], computerOnline: fake.online })
  // A plan's own page is PlanView's; here it has closed.
  if (route === 'item') return json({}, 410)
  if (route === 'week') return json({ plan: planFor(url.searchParams.get('week')!) })
  if (route === 'week-goal') { fake.goals[body.week] = body.goal; return json(body) }
  if (route === 'sweep') return sweep(body)
  if (route === 'task-search') {
    const words = url.searchParams.get('q')!.toLowerCase().split(/\s+/)
    const tasks = fake.tasks.filter(each => words.every(word => each.title.toLowerCase().includes(word))).map(each => ({ ...each,
      backlogGroupName: fake.groups.find(group => group.id === each.backlogGroupId)?.name ?? null }))
    return json({ tasks })
  }
  if (route === 'task') return taskRoute(method, url, body)
  return groupRoute(method, route, url, body)
}

beforeEach(() => {
  // Noon on DAY: the clock stands still unless a test moves it.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 12))
  Object.assign(fake, { tasks: [], goals: {}, online: true, fail: null, hold: null, calls: [],
    groups: [{ id: 'backlog_other', name: 'Other', position: 1000, isDefault: true }] })
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    const url = new URL(path, 'https://inbox.test')
    // The page frame asks which apps the person may open.
    if (url.pathname.startsWith('/api/access/')) return json({ state: 'legacy' })
    const route = url.pathname.replace('/apps/inbox/api/', '')
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) as Body : null
    fake.calls.push({ method, route, body })
    const key = `${method} ${route}`
    if (fake.hold && key.startsWith(fake.hold.on)) {
      const { gate } = fake.hold
      fake.hold = null
      await gate
    }
    if (fake.fail && key.startsWith(fake.fail)) { fake.fail = null; return json({ error: { code: 'internal', message: 'No' } }, 500) }
    return answer(method, route, url, body ?? {} as Body)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

/** Opens the Inbox at its own address, and waits for the board. */
export async function open(at = `/apps/inbox/?day=${DAY}&view=week`, ready = true) {
  const router = createMemoryRouter([{ path: '/apps/:name/*', element: <App /> }], { initialEntries: [at] })
  await act(async () => { render(<RouterProvider router={router} />) })
  if (ready) await screen.findByTestId('backlog-grid')
  return router
}

/** Lets answers and effects finish. */
export const settle = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise(done => setTimeout(done, 0)) })
export const calls = (key: string) => fake.calls.filter(call => `${call.method} ${call.route}`.startsWith(key))
export const titles = (cell: string) => [...screen.getByTestId(cell).querySelectorAll<HTMLTextAreaElement>('[data-testid="task-title"]')].map(box => box.value)
export const row = (title: string) => screen.getByLabelText(`Edit ${title}`).closest<HTMLElement>('[data-testid="task-row"]')!
export const box = (title: string) => screen.getByLabelText<HTMLTextAreaElement>(`Edit ${title}`)
export const press = (element: HTMLElement) => act(async () => { fireEvent.click(element) })
export const button = (name: string | RegExp, scope: HTMLElement = document.body) => within(scope).getByRole('button', { name })
export const key = (element: Element, keyName: string, more: KeyboardEventInit = {}) =>
  act(async () => { fireEvent.keyDown(element, { key: keyName, ...more }) })
/** Opens a row's grip menu with a tap and picks an item, opening its submenu first when it has one. */
export async function menu(title: string, item: string, sub?: string) {
  await press(button(`Task actions for ${title}`))
  if (sub) await key(screen.getByRole('menuitem', { name: sub }), 'ArrowRight')
  await press(screen.getByRole('menuitem', { name: item }))
}
export const type = (element: HTMLElement, value: string) => act(async () => { fireEvent.change(element, { target: { value } }) })
export const blur = (element: HTMLElement) => act(async () => { fireEvent.blur(element) })
