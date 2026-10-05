# Managers: other people who can manage Access

**Status:** ready-to-ship

**Branch:** homely-zebra

**Open questions:** none

## Why

Today only you can add people, edit roles and set key levels in Access, so every change waits for you. You asked on 2026-10-05 to let people you trust do it too, without opening a way for anyone to take the app over.

## What Changes

- **You choose who else manages Access.** A person's page gets one new tick, *Can manage Access*, that only you see and set. Right under it the page says what it means: full trust. Nothing else about the person changes, and it works for a person with a role or with their own set.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ ← People                           │
  │ kim@shop.com · Can sign in         │
  │ Role [Their own set ▾]             │
  │ Apps                               │
  │  [x] Orders                        │
  │  [ ] Payroll · uses Bank           │
  │ [Save access] [Cancel]             │
  └────────────────────────────────────┘

  AFTER (you, the owner)
  ┌────────────────────────────────────┐
  │ ← People                           │
  │ kim@shop.com · Can sign in         │
  │ Role [Their own set ▾]             │
  │ Apps                               │
  │  [x] Orders                        │
  │  [ ] Payroll · uses Bank           │
  │ +Managing                          │
  │ +[x] Can manage Access             │
  │ +Full trust. A manager can add and │
  │ +remove people and give anyone,    │
  │ +themselves included, any app or   │
  │ +key level.                        │
  │ [Save access] [Cancel]             │
  └────────────────────────────────────┘

  AFTER (a manager opens the same page)
  ┌────────────────────────────────────┐
  │ ← People                           │
  │ kim@shop.com · Can sign in         │
  │ +Manager · only the owner changes  │
  │ +this                              │
  │ Role [Their own set ▾]             │
  │ Apps                               │
  │  [x] Orders                        │
  │  [ ] Payroll · uses Bank           │
  │ [Save access] [Cancel]             │
  └────────────────────────────────────┘
  ```
- **A manager does what you do in Access, with three limits.** A manager adds and removes people, makes and edits roles, ticks apps and sets key levels, for anyone, themselves and other managers included. A manager can't pick managers, can't remove a manager, and can't change or remove you. Who the owner is stays a setup step, with no button for it. Managing gives no app or key by itself: a manager keeps their own apps, levels and home page, and does not hold every key as you do.
  ```text
                        │ you │ manager
  ──────────────────────┼─────┼────────
  add, remove people    │ yes │ yes
  roles, apps, levels   │ yes │ yes
  a manager's apps      │ yes │ yes
  pick managers         │ yes │ no
  remove a manager      │ yes │ no
  change the owner      │ no  │ no
  ```
- **The lists show who manages.** People marks each manager and names the owner in one line. A manager sees what they can use, then the same four views you see, with a line saying who the owner is. A manager's row has no *Remove* for them.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ [People]  Roles  Apps  Keys        │
  │ [Add person]                       │
  │ kim@shop.com         Can sign in   │
  │ Own set                            │
  │ Apps [Orders]                      │
  │ [Edit] [Remove]                    │
  └────────────────────────────────────┘

  AFTER (you, the owner)
  ┌────────────────────────────────────┐
  │ [People]  Roles  Apps  Keys        │
  │ +Owner: matt@shop.com              │
  │ [Add person]                       │
  │ kim@shop.com         Can sign in   │
  │ Own set +· Manager                 │
  │ Apps [Orders]                      │
  │ [Edit] [Remove]                    │
  └────────────────────────────────────┘

  AFTER (Kim, a manager)
  ┌────────────────────────────────────┐
  │ You can use                        │
  │ Apps [Orders]                      │
  │ +You manage Access. The owner,     │
  │ +matt@shop.com, picks managers.    │
  │ [People]  Roles  Apps  Keys        │
  │ [Add person]                       │
  │ kim@shop.com         Can sign in   │
  │ Own set · Manager                  │
  │ Apps [Orders]                      │
  │ [Edit]                             │
  │ lee@shop.com         Can sign in   │
  │ Sales                              │
  │ Apps [Orders] [Payroll]            │
  │ [Edit] [Remove]                    │
  └────────────────────────────────────┘
  ```
- **Taking it back works at once.** Untick it and the person's next click in Access is refused, with no sign-out; they keep their apps and levels. Removing a manager also ends their managing, and adding them back later does not bring it back.
  ```text
  person ── you tick ───▶ manager
    ▲                       │
    ├──── you untick ───────┤
    │                       │
  removed ◀── you remove ───┘
  (added back: not a manager)
  ```
- **You can try it on a preview.** The practice list starts with one manager, so you can see the tick and the labels there. As on every preview, the real sign-in list is not touched.

**Non-goals:** Managers picking managers. Holding a manager to the apps and levels they have themselves. A button that changes the owner. Managing as part of a role. A screen that shows who changed what; the app records the person behind each change and shows it nowhere yet. Giving a manager the project's code, memory, or every key. Making previews hold the read-only Cloudflare key, which is a separate piece of work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: the employer may choose current people as managers, who manage people, roles and grants in Access but never make, unmake or remove a manager or change the employer; the requirements that said *only the employer* now name managers too.
- `key-access`: a manager, as well as the employer, sees and sets key levels in Access.

## Impact

- `schema/migrations/`: one additive migration, a table of managers. `schema/seed.sql`: one practice manager.
- `app/worker/employee-access/`: `policy.ts`, `core.ts`, `management.ts`, `members.ts`, `sets.ts`, `apps.ts` and their tests; the shared fixture in `app/tests/employee-access/connections.ts`.
- `app/src/lib/access.ts` and `app/src/apps/access/`: `App.tsx`, `Owner.tsx`, `People.tsx`, `PersonPage.tsx`, `Notices.tsx`, `Access.css` and their tests.
- `wiki/stack/employee-access.md`, `CHANGELOG.md` (a `minor` entry), and the two specs above.
- No new dependency, no new key, no Cloudflare call that is not made today, and no change to what an app tick or a key level allows.

## Decision log

- **2026-10-05** — Asked who picks managers and how much a manager can do in Access → chose that only the owner picks, and a manager does everything else in Access, as full trust the screen states.
- **2026-10-05** — Asked what one manager can do to another manager, or to themselves → chose change apps and levels, not remove; only the owner removes a manager or switches managing off.
- **2026-10-05** — Assumed: managing is a switch on a person, never part of a role, because a manager can edit roles, and a role that carried it would let a manager pick managers.
- **2026-10-05** — Assumed: managing gives no app or key by itself, and a manager keeps their own home page, because a manager can already give themselves what they need and it then shows on the list.
- **2026-10-05** — Assumed: a removed person stops being a manager and does not get it back when added again, because coming back should not quietly restore full trust.
- **2026-10-05** — Assumed: unticking governs the manager's next click with no sign-out, because that is how lowering a key level already works.
- **2026-10-05** — Assumed: People names the owner in one line, because a manager needs to know who picks managers and whom to ask.
- **2026-10-05** — Assumed: the tick has no extra confirm box, because the full-trust line sits right under it and the page still needs *Save access*.
- **2026-10-05** — Assumed: a manager who meets the unfinished-setup notice reads that one step is left for the owner, with no request to copy, because that step needs the owner's Cloudflare token.
- **2026-10-05** — Assumed: a preview walk shows the owner's side only, and code tests cover the manager's own view, because the checker counts as the owner on a preview and can't sign in as a second person.
- **2026-10-05** — Assumed: no screen for who changed what, because nobody asked for one; the record of each change now names the person who made it.
- **2026-10-05** — Assumed: previews holding the read-only Cloudflare key stays out, because the request said to plan only this part.
- **2026-10-05** — Asked what to do with the finished plan → chose build and publish in one go.
- **2026-10-05** — Assumed: the preview walk runs as the publish step's check instead of a task box, because he chose build and publish in one go and that step walks the preview after its one save.
- **2026-10-05** — Assumed: each task's own check ran once, together, after all the code and tests were written, because the build runs its checks at the end.
- **2026-10-05** — Assumed: when the app can't read its permission data, a signed-in person who is not the owner is told Access is unavailable, where before they were told only the owner may do this, because the app can't tell a manager from anyone else without reading it; they are refused either way, and a machine is still refused before anything is read.
- **2026-10-05** — Assumed: the tick is sent only when the owner changed it, because a save that leaves it out keeps what the person has.
- **2026-10-05** — Assumed: in Keys, a manager who meets the missing read-only key reads that the owner finishes it, with nothing to copy, because the same step needs the owner's Cloudflare token as the notice on People.
- **2026-10-05** — Archive checkpoint: built, brought up to date with main, numbered 33.3.0, and saved for the checks before publishing; one new test that raced the list's reload after a save now waits for the list.
- **2026-10-05** — Archive checkpoint: the preview walk passed the owner's side (tick, untick, tick back, and adding a person); the add-a-person check is kept for future publishes, and a manager's own view and every refusal stay covered by code tests only, because a preview has no second sign-in.
