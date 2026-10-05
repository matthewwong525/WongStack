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
  people: [{ email: 'kim@shop.com', status: 'active', settled: true, role: null, manager: false, apps: ['hello'], keys: { stripe: 'read' } }], work: [] }
const setup = { role: 'owner', api: 'authenticated', identity: { email: 'owner@shop.com', subject: 'owner' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic setup prompt' } }

beforeEach(() => vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  if (url.endsWith('/apps')) return Response.json({ state: 'current', role: 'owner', manages: true, apps: ['access', 'hello'], revision: 1 })
  return Response.json(url.endsWith('/setup') ? setup : status)
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

it('fits a phone: the Access and setup screens wrap, and fix no width in pixels', async () => {
  open(); const table = await screen.findByRole('table', { name: 'People' })
  fireEvent.click(screen.getByRole('button', { name: 'Connect your assistant' })); const popup = await screen.findByRole('dialog')
  await within(popup).findByText('Signed in as owner@shop.com')
  expect(all().filter(name => /(^|:)(min-)?w-\[[\d.]+px\]/.test(name))).toEqual([])
  // The popup for connecting an assistant is never wider or taller than the screen, and its text takes the box's width.
  has(popup, 'max-w-[calc(100%-2rem)]', 'max-h-[calc(100dvh-2rem)]', 'overflow-y-auto')
  has(popup.querySelector('textarea')!, 'w-full')
  has(within(popup).getByRole('region', { name: 'Connect your assistant' }).firstElementChild!, 'wrap-anywhere')
  // The heading's own row, a view's title row and the view switch each wrap onto a second line.
  has(screen.getByText('Access', { selector: 'h1' }).parentElement!, 'flex', 'flex-wrap')
  has(screen.getByText('People', { selector: 'h2' }).parentElement!, 'flex', 'flex-wrap')
  has(screen.getByLabelText('Access views'), 'flex', 'flex-wrap')
  // A notice breaks a long word, a row of labels wraps, and a long label breaks.
  has(screen.getByText(/Changes here stay on previews/).closest('[data-slot="alert-description"]')!, 'wrap-anywhere')
  const labels = within(table).getByLabelText('Apps')
  has(labels, 'flex', 'flex-wrap'); has(labels.parentElement!, 'flex', 'flex-wrap')
  has(labels.querySelector('[data-slot="badge"]')!, 'max-w-full', 'whitespace-normal', 'wrap-anywhere')
  cleanup()
  // On a page, the buttons and the level choice wrap, and so does a line under an app's tick; a field takes the page's width.
  open('people/new'); const save = await screen.findByRole('button', { name: 'Save access' })
  has(save.parentElement!, 'flex', 'flex-wrap')
  has(screen.getByLabelText('Email'), 'w-full')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' }))
  has(screen.getByRole('group', { name: 'Hello' }), 'flex', 'flex-wrap')
  has(screen.getByRole('radio', { name: 'Read' }).closest('div')!, 'flex', 'flex-wrap')
})

it('lists are tables whose rows stack on a narrow screen, with nothing scrolling sideways', async () => {
  open(); const table = await screen.findByRole('table', { name: 'People' })
  // The page measures itself, so the rows stack by the room they have; the wider page never passes the screen.
  const page = table.closest('.\\@container')!
  has(page, '@container', 'w-[min(60rem,100vw_-_2rem)]')
  const [head, body] = [table.querySelector('thead')!, table.querySelector('tbody')!]
  const row = within(table).getByText('kim@shop.com').closest('tr')!
  const cells = Array.from(row.querySelectorAll('td'))
  has(table, `${STACKED}block`); has(body, `${STACKED}block`); has(row, `${STACKED}grid`, `${STACKED}grid-cols-[1fr_auto]`)
  for (const cell of cells) has(cell, `${STACKED}block`, 'wrap-anywhere', 'whitespace-normal')
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
  open('roles'); const keys = within(await screen.findByRole('table', { name: 'Roles' })).getByLabelText('Keys').closest('td')!
  expect(keys.getAttribute('data-label')).toBe('Keys')
  has(keys, `${STACKED}data-label:before:content-[attr(data-label)_":_"]`)
})

it('marks the current view, a level, a gap and a label by more than colour', async () => {
  open('roles'); const table = await screen.findByRole('table', { name: 'Roles' })
  // The current view is boxed, bold and underlined.
  const views = within(screen.getByLabelText('Access views')).getAllByRole('link')
  expect(views.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.textContent)).toEqual(['Roles 1'])
  for (const link of views) has(link, 'aria-[current=page]:border-border', 'aria-[current=page]:font-bold', 'aria-[current=page]:underline')
  // A gap is bold with a bar beside it, and a label has a border: the "!" and the level's words are in the text itself.
  const gap = within(table).getByText('Hello can look up, not change')
  expect(gap.textContent).toBe('! Hello can look up, not change'); has(gap, 'border-s-[0.2rem]', 'font-semibold')
  const label = within(table).getByText('Stripe Read')
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
