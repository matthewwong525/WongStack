// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import type { Status } from '../../lib/access'
import { VIEWS } from './address'
import { Notices } from './Notices'

// An owner's People view on the live app, where the first open could not read the sign-in list.
const status = (startError: string | null): Status => ({ ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true },
  environment: 'live', key: 'ready', started: false, startError, imported: 0, keysStarted: false, unticked: { people: [], roles: [] },
  apps: [], keys: [], roles: [], people: [], work: [], project: 'ready' })
const show = (startError: string | null) => render(<MemoryRouter><Notices status={status(startError)} id="" view={VIEWS[0]}
  pending={false} save={() => {}} reload={() => {}} /></MemoryRouter>)
const why = () => screen.queryByText(/^Why:/)?.textContent
afterEach(cleanup)

it('says why the sign-in list could not be read, in plain words with the code beside them, inside the same notice', () => {
  show('login_policy_review_required')
  expect(why()).toBe('Why: The sign-in list has a rule this app does not manage, so a person must check it. (login_policy_review_required)')
  expect(screen.getByText(/^Why:/).closest('[data-slot="alert"]')!.textContent).toMatch(/could not be read yet.*Read it again/)
})

it('reads a code it does not know as an odd answer, still with its code, and shows no line without one', () => {
  show('login_policy_unreadable')
  expect(why()).toBe("Why: Cloudflare's answer was not in a shape this app reads. (login_policy_unreadable)")
  cleanup(); show(null)
  expect([!!screen.getByText(/could not be read yet/), why()]).toEqual([true, undefined])
})
