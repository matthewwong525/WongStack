# An Access screen that is quicker to use and easier to read

**Status:** ready-to-ship

**Branch:** improve-access-permissions-ui

**Open questions:** none

## Why

Access now sets Read or Read & write for each saved key, but giving someone an app and the right level takes two lists and a scroll, and every list is one long dotted line, so you can't tell at a glance who has what. The assistant also could not check your screens on a preview last time, because the checker never signs in as you.

## What Changes

- **An app's keys sit under its tick.** On a person's page and a role's page, ticking an app shows the level of each key it uses right there, so you give the app and pick the level in one place. Ticking still gives Read, never Read & write. A key two ticked apps share shows under both and is one level: change it under one and the other follows. Keys no ticked app uses, such as Cloudflare look-ups, sit in a short list below. An app's own page and a key's own page keep their layout.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ ← People                           │
  │ kim@shop.com · Can sign in         │
  │ Role [Their own set ▾]             │
  │ Apps                               │
  │  [x] Hello                         │
  │      uses Stripe: look up, change  │
  │      can look up, not change       │
  │  [ ] Payroll                       │
  │      uses Bank: look up, change    │
  │ Keys                               │
  │  Stripe  (None)(•Read)(Read&write) │
  │  Bank    (•None)(Read)(Read&write) │
  │  Cloudflare  (None)(•Read)         │
  │ [Save access] [Cancel]             │
  └────────────────────────────────────┘
  
  AFTER
  ┌────────────────────────────────────┐
  │ ← People                           │
  │ kim@shop.com · Can sign in         │
  │ Role [Their own set ▾]             │
  │ Apps                               │
  │  [x] Hello                         │
  │     +Stripe (None)(•Read)(R&write) │
  │     +Hello also changes things.    │
  │      Pick Read & write to let it.  │
  │  [ ] Payroll · uses Bank           │
  │  [x] Tip calculator · no keys      │
  │ +Keys no ticked app uses           │
  │  Cloudflare  (None)(•Read)         │
  │    look-ups, no app needed         │
  │  Bank  (•None)(Read)(Read&write)   │
  │ [Save access] [Cancel]             │
  └────────────────────────────────────┘
  ```
- **People and Roles show apps and levels as labels.** Each person and role lists its apps and its key levels as small labels, one per app and one per key, with the level written in words. A line marked with `!` says where an app can't do its job yet, such as *Hello can look up, not change*, so you see a gap without opening the page. A person with a role shows the role's name; one without shows *Own set*.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ kim@shop.com                       │
  │ Can sign in                        │
  │ Hello, Tip calculator · Stripe:    │
  │ Read · Cloudflare: Read            │
  │ [Edit] [Remove]                    │
  └────────────────────────────────────┘
  
  AFTER
  ┌────────────────────────────────────┐
  │ kim@shop.com         Can sign in   │
  │ Own set                            │
  │ Apps [Hello] [Tip calculator]      │
  │ Keys [Stripe Read] [Cloudflare     │
  │      Read]                         │
  │ +! Hello can look up, not change   │
  │ [Edit] [Remove]                    │
  └────────────────────────────────────┘
  ```
- **Apps and Keys group who has what by level.** A key lists who has Read & write and who has Read on separate lines. An app lists who has it the same way as labels. Every list uses *Edit* for its button, where three of them said *Change*.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ Stripe                     Saved   │
  │ Used by Hello: look up, change     │
  │ Office: Read & write · Sales:      │
  │ Read · kim@shop.com: Read          │
  │ [Change]                           │
  └────────────────────────────────────┘
  
  AFTER
  ┌────────────────────────────────────┐
  │ Stripe                     Saved   │
  │ Used by Hello: look up, change     │
  │ +Read & write  Office              │
  │ +Read          Sales, kim@shop.com │
  │ [Edit]                             │
  └────────────────────────────────────┘
  ```
- **Your own view uses the same labels.** Someone who is not the owner sees their apps and levels as labels too.
  ```text
  BEFORE
  ┌────────────────────────────────────┐
  │ You can use                        │
  │ Hello · Tip calculator             │
  │ Cloudflare: Read                   │
  └────────────────────────────────────┘
  
  AFTER
  ┌────────────────────────────────────┐
  │ You can use                        │
  │ Apps [Hello] [Tip calculator]      │
  │ Keys [Cloudflare Read]             │
  └────────────────────────────────────┘
  ```
- **A save you can't miss, and no change lost by accident.** After a save, the list opens with a *Saved* box at the top, or a box that says the save did not finish. Leaving a page with changes you have not saved asks first. The level picker and the Apps and Keys groups get a tidier look; the picker stays a real set of buttons you can reach from the keyboard.
  ```text
  edit ─▶ Save ─▶ list, +"Saved" box on top
    │
    └▶ leave with changes
         │
         ▼
    +"Leave without saving?"
     [Keep editing] [Leave]
  ```
- **The checker can open your screens on previews.** On a preview, the assistant's checker opens and saves the owner's Access screens against the practice list, so it can click through a change and show you pictures. On the live app nothing changes: the checker keeps every app and never manages people.
  ```text
              │ preview        │ live app
  ────────────┼────────────────┼──────────
  you (owner) │ everything     │ everything
  the checker │ +your screens, │ apps only,
              │ practice list  │ no people
  ```

**Non-goals:** A who-has-what table. A wider page for Access. Setting a level straight from a list without opening a page. Search or filters in the lists. A change to what a level allows, to roles, or to who can sign in. Letting the checker manage people on the live app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: Access sets an app's key levels beside the app on a person's or role's page, and its lists show each gap between a level and what an app does.
- `employee-onboarding`: the verification service token may open and save the employer's Access screens on a preview, never on the live app; Access asks before unsaved changes are lost.

## Impact

- `app/src/apps/access/`: `SetFields.tsx`, `LevelChoice.tsx`, the four list views, `Own.tsx`, `Owner.tsx`, `Page.tsx`, `levels.ts`, `subjects.ts`, `Access.css`, and their tests.
- `app/worker/employee-access/policy.ts` and `core.ts`: the checker counts as the owner when `WONG_ENVIRONMENT` is `staging`.
- `wiki/stack/employee-access.md`, `CHANGELOG.md` (a `minor` entry), and the two specs above.
- No database change, no new dependency, no change to the live app's rules.

## Decision log

- **2026-10-05** — Asked how far the Access screen change should go → chose to rework the editing pages and the lists, keeping the four views and their addresses, with no who-has-what table.
- **2026-10-05** — Asked what bothered him when using it → chose *hard to see who has what* and *too many steps*.
- **2026-10-05** — Asked whether to fix that the checker could not open the owner's screens on a preview → chose to let the checker act as owner on previews only.
- **2026-10-05** — Assumed: labels in the lists answer *who has what* without a table, because he chose the option without one and the page stays a narrow column.
- **2026-10-05** — Assumed: a key two ticked apps share shows under both and stays one level, because a level is the key's, not the app's, and hiding it under the second app would hide why that app works.
- **2026-10-05** — Assumed: an app's own page and a key's own page keep their layout, because each already sets its levels in one place.
- **2026-10-05** — Assumed: every list button says *Edit*, because People already does and it is the commoner word.
- **2026-10-05** — Assumed: the checker acts as owner on staging and its previews only, not on a local run, because local runs already have their own sign-in.
- **2026-10-05** — Assumed: this repo's previews can show the labels, the Cloudflare key, the saved box and the leave question, but not a key under an app, because no built app here uses a saved key; code tests cover that part.
- **2026-10-05** — Build: each task's own test run moved to one final run after all code and tests were written; every acceptance check stayed.
- **2026-10-05** — Assumed: a person with every app shows a label per app, where the list said *All apps*, because the plan asks for one label per app.
- **2026-10-05** — Assumed: a key no ticked app uses carries no *nothing uses it yet* line, because its group's heading already says so.
- **2026-10-05** — Assumed: the view switch stays off a person's, role's, app's and key's page, as before; the leave question covers the back link, *Cancel*, any other link, the browser's Back button, a reload and a closed tab.
- **2026-10-05** — Assumed: the shared-level line shows under each app that shares the key, not only the second, so the first one explains itself too.
- **2026-10-05** — Assumed: the preview walk runs as the publish step's check instead of a task box, because he chose build and publish in one go and that step walks the preview after its one save.
- **2026-10-05** — Archive checkpoint: built, merged with the two releases published meanwhile (the Keys view keeps their *Not on previews yet* line), numbered 33.2.0, and saved for the checks before publishing.
- **2026-10-05** — Archive checkpoint: the preview walk passed both walkable promises; the leave-question check is kept for future publishes, and the owner-screens walk is left out because its replay takes longer than 30 seconds.
