// @vitest-environment jsdom
// An item opened by its own link, as the daily sends it: its card, as the list shows it, never its raw body.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { calls, card, FIRST, item, PLAN, QUESTION, SECOND, send, server, show, taps } from './App.test.kit'

const ASK = { text: 'Pre-order chat: ship the doc fix, or set up the HP box?\n\nSteps 1-4 are done.',
  options: ['Ship the doc fix and close this chat', 'Set up the HP box and the kits now'] }
const visit = (id: string) => show(`/apps/inbox/?item=${id}`)

it('shows a question opened by its link as its card, answered and sent as from the list', async () => {
  server.items = [item(QUESTION, 'question', 'Pre-order chat', { workspace: 'finicky-bullfrog', detail: ASK }), item(FIRST, 'approval', 'Send the quote')]
  visit(QUESTION)
  await screen.findByRole('radio', { name: /Ship the doc fix/ })
  const question = card('Pre-order chat')
  expect(within(question).getByRole('heading', { level: 3 }).textContent).toBe(ASK.text)
  expect(within(question).getAllByRole('radio').map(radio => radio.textContent)).toEqual([`1${ASK.options[0]}`, `2${ASK.options[1]}`])
  expect(within(question).getByPlaceholderText('Or type your own answer')).toBeTruthy()
  // Its own page: Back and where it came from, with no raw words, no frame, and nothing else from the list.
  expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/apps/inbox/')
  expect(screen.getByRole('heading', { level: 1, name: 'Pre-order chat' }).className).toBe('sr-only')
  expect(document.body.textContent).not.toMatch(/\{"text"|\\n|"options"/)
  expect(document.querySelector('iframe')).toBeNull()
  expect(screen.queryByText('Send the quote')).toBeNull()
  expect(screen.queryByText(/^Computer (online|offline)$/)).toBeNull()
  expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  expect(document.querySelector('section')!.hasAttribute('aria-labelledby')).toBe(false)
  await act(async () => { fireEvent.click(within(question).getByRole('radio', { name: /Ship the doc fix/ })) })
  await send(/^Send 1 answer$/)
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: ASK.options[0] }])
  expect(await within(card('Pre-order chat')).findByText(/Waiting/)).toBeTruthy()
  // The list asks for the computer on its own: the page around it reads the item once.
  expect(calls.filter(call => call.path.includes('item?'))).toHaveLength(1)
})

it('shows an approval and a morning plan card as their cards, and a link with Open and no Send', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote'), item(PLAN, 'start', 'Write the ad brief', { workspace: 'brief',
    detail: { state: 'ready', plan: { willDo: ['Draft the brief.'], needs: [], askFirst: [], questions: [] } } }),
  item(SECOND, 'link', 'Save your login', { link: { what: 'login', url: 'https://example.com/#key=a' } })]
  visit(FIRST)
  await screen.findByRole('radio', { name: "Don't approve" })
  expect(within(card('Send the quote')).getByText('Risky')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Send 0 answers' })).toBeTruthy()
  cleanup()
  visit(PLAN)
  await screen.findByText('Will do')
  expect(screen.getByRole('radio', { name: 'Go' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByRole('button', { name: 'Start 1 agent' })).toBeTruthy()
  expect(screen.queryByText('Send the quote')).toBeNull()
  cleanup()
  visit(SECOND)
  expect((await screen.findByRole('link', { name: 'Open' })).getAttribute('href')).toBe('https://example.com/#key=a')
  expect(screen.queryByRole('button', { name: /^Send/ })).toBeNull()
})

it('says the item has closed when the list no longer holds it, with Back', async () => {
  // Answered in its chat between the page's two reads: the item still reads, and the list has let it go.
  server.one = id => Response.json({ item: { ...item(id, 'question', 'Which day?'), body: '{}' }, computerOnline: true })
  visit(QUESTION)
  expect((await screen.findByRole('alert')).textContent).toBe('This has closed. Ask its chat for a new link.')
  expect(screen.getByRole('link', { name: 'Back' })).toBeTruthy()
})
