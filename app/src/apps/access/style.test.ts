// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Status } from '../../lib/access'
import { App } from './App'

// Access brings no stylesheet: its look is the classes on its own elements and on the ready-made parts it is built
// from. This draws the screens and reads those classes, so what a phone and a screen reader are promised is held
// where it now lives. That no screen has a CSS file of its own is checked once for the whole app, in src/style.test.ts.
const status: Status = { ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'practice', key: 'practice', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello'], appKeys: { hello: [{ id: 'stripe', need: 'write' }] },
  keys: [{ id: 'stripe', title: 'Stripe', levels: ['read', 'write'], saved: true, setup: false, usedBy: [{ app: 'hello', need: 'write' }], alone: false }],
  roles: [{ id: 'sales', name: 'Sales', apps: ['hello'], keys: { stripe: 'read' } }],
  people: [{ email: 'kim@shop.com', status: 'active', settled: true, role: null, manager: false, apps: ['hello'], keys: { stripe: 'read' } },
    { email: 'lee@shop.com', status: 'active', settled: true, role: 'sales', manager: false, apps: ['hello'], keys: { stripe: 'read' } }], work: [], project: 'ready' }

beforeEach(() => vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  if (url.endsWith('/apps')) return Response.json({ state: 'current', role: 'owner', manages: true, apps: ['access', 'hello'], revision: 1 })
  return Response.json(status)
})))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const open = (path = '') => render(createElement(MemoryRouter, { initialEntries: [`/apps/access/${path}`] },
  createElement(Routes, null, createElement(Route, { path: '/apps/:name/*', element: createElement(App) }))))
// The classes on one element, and on every element drawn, the popup's included: it is drawn outside the page.
const classes = (element: Element) => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const all = () => Array.from(document.body.querySelectorAll('*')).flatMap(classes)
const has = (element: Element, ...wanted: string[]) => expect(classes(element)).toEqual(expect.arrayContaining(wanted))
const STACKED = '@max-[44rem]:'
// A class that takes something off the screen.
const GONE = /(^|:)(hidden|invisible|opacity-0|sr-only)$/

it('fits a phone: the Access screens wrap, and fix no width in pixels', async () => {
  open(); await screen.findByRole('table', { name: 'People' })
  const pixels = () => all().filter(name => /(^|:)(min-)?w-\[[\d.]+px\]/.test(name))
  expect(pixels()).toEqual([])
  // The views are the heading: the switch and the add button share one line, which wraps, and so does the switch.
  const views = screen.getByLabelText('Access views')
  has(views, 'flex', 'flex-wrap'); has(views.parentElement!, 'flex', 'flex-wrap', 'justify-between')
  expect(views.parentElement!.lastElementChild).toBe(screen.getByRole('link', { name: 'Add person' }))
  expect(document.querySelector('h2')).toBeNull()
  // A notice breaks a long word.
  has(screen.getByText(/Changes here stay on previews/).closest('[data-slot="alert-description"]')!, 'wrap-anywhere')
  cleanup()
  // An opened item is a panel on the right: the screen's whole width on a phone, a readable one on a computer.
  open('people/new'); const save = await screen.findByRole('button', { name: 'Save access' })
  const panel = screen.getByRole('dialog', { name: 'Add person' })
  has(panel, 'fixed', 'inset-y-0', 'right-0', 'w-full', 'sm:max-w-md', 'sm:top-15', 'sm:h-auto'); expect(classes(panel)).not.toContain('w-3/4')
  // Its fields scroll, with the buttons kept in view under them; the buttons and the level choice wrap, and so
  // does a line under an app's tick; a field takes the panel's width.
  has(save.parentElement!, 'flex', 'flex-wrap', 'border-t'); has(save.parentElement!.previousElementSibling!, 'overflow-y-auto', 'flex-1')
  has(within(panel).getByRole('heading', { name: 'Add person' }), 'wrap-anywhere')
  has(screen.getByLabelText('Email'), 'w-full')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' }))
  has(screen.getByRole('group', { name: 'Hello' }), 'flex', 'flex-wrap')
  has(screen.getByRole('radio', { name: 'Read' }).closest('div')!, 'flex', 'flex-wrap')
  // No box goes round a group of ticks: its bold name sets it apart.
  const group = screen.getByRole('group', { name: 'Apps' })
  expect(classes(group).filter(name => /^(border|rounded)/.test(name))).toEqual([]); has(group.querySelector('legend')!, 'font-bold')
  expect(pixels()).toEqual([])
})

it('lists are tables in the shared frame whose rows are one line, and stack on a narrow screen with nothing scrolling sideways', async () => {
  open(); const table = await screen.findByRole('table', { name: 'People' })
  // Access takes the frame every page shares: no width or margin of its own. It measures itself, so rows stack by the room they have.
  const page = table.closest('.\\@container')!
  has(page, '@container'); expect(page).toBe(screen.getByRole('heading', { name: 'Access' }).parentElement)
  expect(classes(page).filter(name => /(^|:)-?(m[xselr]?|w|min-w|max-w)-/.test(name))).toEqual([])
  // Each table is named by its view in the switch above it.
  expect(table.getAttribute('aria-labelledby')).toBe(screen.getByLabelText('Access views').querySelector('[aria-current="page"] span')!.id)
  const [head, body] = [table.querySelector('thead')!, table.querySelector('tbody')!]
  const row = within(table).getByText('kim@shop.com').closest('tr')!
  const cells = Array.from(row.querySelectorAll('td'))
  has(table, `${STACKED}block`); has(body, `${STACKED}block`); has(row, `${STACKED}grid`, `${STACKED}grid-cols-[minmax(0,1fr)_auto]`)
  // Every row is one height on a computer, the owner's with no control in it included; a stacked row takes what it needs.
  for (const each of within(table).getAllByRole('row').slice(1)) has(each, 'h-14', `${STACKED}h-auto`)
  // One line on a computer: no cell wraps there. Stacked, a line may wrap and a long word breaks.
  for (const cell of cells) {
    has(cell, 'whitespace-nowrap', 'align-middle', `${STACKED}block`, `${STACKED}whitespace-normal`, `${STACKED}wrap-anywhere`)
    expect(classes(cell)).not.toContain('align-top')
  }
  // A long email gives way: it ends in "…" with the whole of it in its title, and its column takes a share of the row.
  const email = within(row).getByRole('link', { name: 'kim@shop.com' })
  has(email, 'truncate'); expect(email.title).toBe('kim@shop.com'); has(cells[0], 'max-w-0', `${STACKED}max-w-none`)
  // The name with the row's menu beside it, then a line per cell.
  has(cells[1], `${STACKED}not-first:col-span-full`); has(cells.at(-1)!, `${STACKED}col-start-2`, `${STACKED}row-start-1`)
  // The header row stays for a screen reader: hidden from sight once rows stack, never removed.
  has(head, `${STACKED}sr-only`); expect(classes(head).filter(name => GONE.test(name))).toEqual([`${STACKED}sr-only`])
  expect(within(head).getAllByRole('columnheader')).toHaveLength(5)
  has(within(head).getByText('Actions'), 'sr-only')
  // No row is boxed: a line divides the rows.
  has(row, 'border-b')
  expect(all().filter(name => /overflow-x-(auto|scroll)$/.test(name))).toEqual([])
  cleanup()
  // A cell shows its column's name where its words don't say it.
  open('roles'); const people = within(await screen.findByRole('table', { name: 'Roles' })).getByText('1 person')
  expect([people.tagName, people.getAttribute('data-label')]).toEqual(['TD', 'People'])
  has(people, `${STACKED}data-label:before:content-[attr(data-label)_":_"]`)
  cleanup()
  // Words too long for their column are cut the same way, and a quiet line under the list says how an app is made.
  open('apps'); const uses = within(await screen.findByRole('table', { name: 'Apps' })).getByText('Stripe: look up, change')
  has(uses, 'truncate', 'max-w-0'); expect([uses.title, uses.getAttribute('data-label')]).toEqual(['Stripe: look up, change', 'Uses'])
  has(screen.getByText('Ask your assistant to build an app.'), 'text-sm', 'text-muted-foreground')
})

it('marks the current view, the open row, a level, a gap and a label by more than colour', async () => {
  open('roles'); const table = await screen.findByRole('table', { name: 'Roles' })
  // The current view is boxed, bold and underlined.
  const views = within(screen.getByLabelText('Access views')).getAllByRole('link')
  expect(views.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.textContent)).toEqual(['Roles 1'])
  for (const link of views) has(link, 'aria-[current=page]:border-border', 'aria-[current=page]:font-bold', 'aria-[current=page]:underline')
  // A gap on a row is bold, and the "!" is in the text itself.
  const gap = within(table).getByText('1 gap')
  expect([gap.tagName, gap.textContent]).toEqual(['STRONG', '! 1 gap']); has(gap, 'font-semibold')
  // No row is marked until one is open.
  expect(document.querySelector('tr[aria-current]')).toBeNull()
  cleanup()
  // The open row is told to a screen reader, filled, and has a bar on its leading edge.
  open('people/lee@shop.com'); const panel = await screen.findByRole('dialog', { name: 'lee@shop.com' })
  const marked = Array.from(document.querySelectorAll('tr[aria-current="true"]'))
  expect(marked).toEqual([screen.getByRole('link', { name: 'lee@shop.com' }).closest('tr')])
  has(marked[0], 'aria-[current=true]:bg-muted', 'aria-[current=true]:[&>td:first-child]:shadow-[inset_0.2rem_0_0_var(--color-primary)]')
  // Opened, what a role gives is named: a gap is bold with a bar beside it, and a label has a border.
  const line = within(panel).getByText('Hello can look up, not change')
  expect(line.textContent).toBe('! Hello can look up, not change'); has(line, 'border-s-[0.2rem]', 'font-semibold')
  const label = within(panel).getByText('Stripe Read')
  expect([label.getAttribute('data-slot'), label.getAttribute('data-variant')]).toEqual(['badge', 'outline']); has(label, 'border', 'border-border')
  cleanup()
  // The radio buttons stay on screen: the dot shows the choice, its words are bold, and the keyboard can reach it.
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  const radios = screen.getAllByRole('radio') as HTMLInputElement[]
  expect(radios.map(radio => [radio.type, radio.parentElement!.textContent, radio.checked])).toEqual([['radio', 'None', false], ['radio', 'Read', true], ['radio', 'Read & write', false]])
  for (const radio of radios) {
    expect(classes(radio).filter(name => GONE.test(name))).toEqual([])
    has(radio.parentElement!, 'has-checked:font-semibold')
  }
  for (const tick of screen.getAllByRole('checkbox')) expect(classes(tick).filter(name => GONE.test(name))).toEqual([])
})
