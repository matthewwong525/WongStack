// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { button, calls, fake, key, open, row, settle, task, titles, WEEK } from './week.test.kit'

let under: Element | null = null
beforeEach(() => {
  under = null
  document.elementFromPoint = () => under
  vi.stubGlobal('scrollBy', vi.fn())
})

const pointer = (type: 'pointerMove' | 'pointerUp' | 'pointerCancel', y = 300) =>
  act(async () => { fireEvent[type](window, { clientX: 20, clientY: y }) })
/** Presses a grip and moves past the drag distance. */
async function lift(grip: HTMLElement) {
  await act(async () => { fireEvent.pointerDown(grip, { button: 0, clientX: 20, clientY: 300 }) })
  await pointer('pointerMove', 302)
  await pointer('pointerMove', 310)
}
const cell = (key: string) => document.querySelector<HTMLElement>(`[data-slot-key="${key}"]`)!
/** Rows report a place on the page: each is 40 pixels high, from the top. */
function placeRows(section: HTMLElement) {
  section.querySelectorAll<HTMLElement>('[data-drop-index]').forEach((each, at) => {
    each.getBoundingClientRect = () => ({ top: at * 40, height: 40 } as DOMRect)
  })
}

it('drags a task by its grip to a place in another day, with a line where it will land', async () => {
  task('Read')
  task('Write', { slot: 'thu' })
  task('Fix', { slot: 'thu' })
  await open()
  await lift(button('Task actions for Read'))
  expect(screen.getByText('Read', { selector: '.fixed' })).toBeTruthy()
  expect(row('Read').className).toContain('opacity-30')
  expect(document.body.style.userSelect).toBe('none')
  placeRows(cell('thu'))
  under = cell('thu')
  await pointer('pointerMove', 50)
  expect(cell('thu').querySelectorAll('[data-testid="drop-line"]')).toHaveLength(1)
  expect(cell('thu').className).toContain('ring-1')
  await pointer('pointerMove', 500)
  // The click that ends a drag opens no menu.
  await act(async () => {
    fireEvent.pointerUp(window, { clientX: 20, clientY: 500 })
    fireEvent.click(button('Task actions for Read'))
  })
  await settle()
  expect(calls('PATCH task')[0].body).toEqual({ id: 'task_1', week: WEEK, slot: 'thu', index: 2 })
  expect(titles('day-thu')).toEqual(['Write', 'Fix', 'Read'])
  expect(document.body.style.userSelect).toBe('')
  expect(screen.queryByRole('menu')).toBeNull()
})

it('drops into an empty cell and into a backlog subgroup, and takes a failed drop back', async () => {
  task('Read')
  task('Plan', { slot: 'backlog' })
  fake.groups.push({ id: 'group_1', name: 'Home', position: 2000, isDefault: false })
  await open()
  await lift(button('Task actions for Read'))
  under = cell('mon').querySelector('[data-drop-index]')
  placeRows(cell('mon'))
  await pointer('pointerMove', 10)
  expect(cell('mon').querySelectorAll('[data-testid="drop-line"]')).toHaveLength(1)
  await pointer('pointerUp', 10)
  await settle()
  expect(titles('day-mon')).toEqual(['Read'])
  await lift(button('Task actions for Plan'))
  under = document.querySelector('[data-backlog-group-id="group_1"]')
  await pointer('pointerMove')
  await pointer('pointerUp')
  await settle()
  expect(calls('PATCH task')[1].body).toEqual({ id: 'task_2', week: WEEK, slot: 'backlog', backlogGroupId: 'group_1', index: 0 })
  expect(titles('backlog-group-group_1')).toEqual(['Plan'])
  fake.fail = 'PATCH task'
  await lift(button('Task actions for Plan'))
  under = cell('fri')
  await pointer('pointerMove')
  await pointer('pointerUp')
  await settle()
  expect(titles('backlog-group-group_1')).toEqual(['Plan'])
  expect(screen.getByRole('alert').textContent).toContain('That move did not save.')
})

it('drops nothing outside a cell, on cancel, after a short press, or from another button', async () => {
  task('Read')
  await open()
  const grip = button('Task actions for Read')
  await lift(grip)
  await pointer('pointerMove', 200)
  await act(async () => {
    document.dispatchEvent(new Event('selectstart', { cancelable: true }))
    document.dispatchEvent(new Event('contextmenu', { cancelable: true }))
  })
  await pointer('pointerUp')
  under = cell('mon')
  await lift(grip)
  await pointer('pointerCancel')
  await act(async () => { fireEvent.pointerDown(grip, { button: 0, clientX: 20, clientY: 300 }) })
  await pointer('pointerMove', 302)
  await pointer('pointerUp', 302)
  await act(async () => { fireEvent.pointerDown(grip, { button: 2, clientX: 20, clientY: 300 }) })
  await pointer('pointerMove', 400)
  await pointer('pointerUp', 400)
  await settle()
  expect(calls('PATCH task')).toHaveLength(0)
  expect(screen.queryByText('Read', { selector: '.fixed' })).toBeNull()
})

it('scrolls the page while a drag is held near its top or bottom edge', async () => {
  task('Read')
  await open()
  await lift(button('Task actions for Read'))
  await pointer('pointerMove', 10)
  await waitFor(() => expect(window.scrollBy).toHaveBeenCalledWith(0, -14))
  await pointer('pointerMove', window.innerHeight - 10)
  await waitFor(() => expect(window.scrollBy).toHaveBeenCalledWith(0, 14))
  await pointer('pointerUp', 300)
})

it('drags no line that the app has not stored yet', async () => {
  task('Read')
  await open()
  screen.getByLabelText<HTMLTextAreaElement>('Edit Read').setSelectionRange(4, 4)
  await key(screen.getByLabelText('Edit Read'), 'Enter')
  await lift(button('Task actions for'))
  expect(document.querySelector('.fixed')).toBeNull()
  await pointer('pointerUp')
})

it('drags a subgroup to a new place, showing the order a release would give', async () => {
  fake.groups.push({ id: 'group_1', name: 'Home', position: 2000, isDefault: false })
  fake.groups.push({ id: 'group_2', name: 'Work', position: 3000, isDefault: false })
  await open()
  const order = () => [...document.querySelectorAll('[data-group-drop-index] h3')].map(heading => heading.textContent)
  await lift(button('Manage Work'))
  expect(screen.getByText('Work', { selector: '.fixed' })).toBeTruthy()
  under = document.querySelector('[data-group-drop-index="0"]')
  await pointer('pointerMove')
  expect(order()).toEqual(['Work', 'Other', 'Home'])
  // A gap between columns keeps the last place.
  under = null
  await pointer('pointerMove')
  expect(order()).toEqual(['Work', 'Other', 'Home'])
  await pointer('pointerUp')
  await settle()
  expect(calls('POST group-move')[0].body).toEqual({ id: 'group_2', index: 0 })
  await lift(button('Manage Work'))
  under = document.querySelector('[data-group-drop-index="0"]')
  await pointer('pointerMove')
  await pointer('pointerUp')
  await settle()
  expect(calls('POST group-move')).toHaveLength(1)
})
