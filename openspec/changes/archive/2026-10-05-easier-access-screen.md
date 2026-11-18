<!-- openspec-archive v1 2026-10-05-easier-access-screen -->
<!-- file proposal.md utf8 11720 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 7273 -->
# Design

## Context

See [the proposal](proposal.md) for why. Access's owner screens live in `app/src/apps/access/`: four list views (`People.tsx`, `Roles.tsx`, `Apps.tsx`, `Keys.tsx`), a page under each, and shared parts (`SetFields.tsx`, `LevelChoice.tsx`, `Page.tsx`, `View.tsx`). `Owner.tsx` reads the whole status once and hands every view the same `save`. Text lines come from `levels.ts`, `subjects.ts` and `status.ts`.

Constraints that shape the work:

- `style.test.ts` holds `Access.css` to `.access-` selectors, no pixel widths, wrapping rows, and a current view and level marked by more than colour.
- The page is the shared 32rem column from `app/public/style.css`, the only file that styles whole elements.
- The app uses a data router (`createBrowserRouter` in `app/src/main.tsx`), so `useBlocker` is available; the Access tests render through `MemoryRouter`, which is not one.
- `policy.ts` gives the verification service token every app and the role `employee`; `ownerCore()` in `core.ts` refuses anything but the owner's verified human email. `WONG_ENVIRONMENT` is `production`, `staging` or `local`, committed per Worker in `app/wrangler.jsonc`.
- This repo's one saved key, Cloudflare, is used by no app.

## Goals / Non-Goals

**Goals:** one place to give an app and its key level; lists that read at a glance; the assistant can walk the owner's screens on a preview.

**Non-Goals:** any change to the status response, the save routes or the database; a table view; a design system beyond `Access.css`.

## Decisions

### 1. `SetFields` nests each ticked app's keys under it

`SetFields` keeps its props. For a ticked app it renders a `LevelChoice` per `appUses(status, app)` key, bound to the same `set.keys[key.id]`, so two apps sharing a key stay in step with no extra state. Under the picker, `shortLine` becomes a hint that names the fix (*Pick Read & write to let it*). An unticked app shows a short `uses …` beside its name. Below, a second group lists the keys no ticked app uses, with `heldUseLine`'s note for a key that works alone.

*Instead of* a separate "raise all to Read & write" shortcut: ticking must never give Read & write, and a shortcut one tap from the tick blurs that.

*Shared keys:* each `LevelChoice` already takes its radio group name from `useId`, so the same key under two apps is two groups showing one value. A muted line under the second says the level is shared.

### 2. Labels are one small part, fed by data helpers

A new `Labels.tsx` renders a list of short strings as `<ul class="access-labels">` chips. `levels.ts` gains helpers that return arrays where it now returns dotted strings (apps as titles, levels as `Stripe Read`), and a `gaps(status, set)` that returns each `shortLine` with its app's title. `People`, `Roles`, `Apps`, `Keys` and `Own` use them. `subjects.ts` gains `holdersByLevel(status, key)` for the Keys list. The dotted-line helpers that lose their last caller are deleted, with their tests moved to the new ones.

*Instead of* colour-coded chips: the level is written in the chip, and a gap line starts with a `!` and the word, so nothing depends on colour, as `style.test.ts` already demands for the level picker.

### 3. The save result is a notice box, and leaving asks first

`Owner.tsx` already carries the result in router state. It renders in the `access-notice` box with `role="status"`, and with `role="alert"` when the save did not finish; the empty paragraph it leaves today goes.

`Page.tsx` takes a `changed` flag from each page (current state compared with its starting state). When set, the back link, *Cancel* and the view switch ask through the existing `Confirm` part; `beforeunload` covers a reload or a closed tab. `useBlocker` covers the browser's Back button where a data router is present; the guard on the page's own links is what the `MemoryRouter` tests exercise.

*Instead of* autosave: a removal and a role change govern people's next request, so each save stays one deliberate press.

### 4. The checker is the owner on staging

`policy.ts` exports its `checker()` test. In `currentPolicy()`, and in `ownerCore()`, a checker identity counts as the owner when `env.WONG_ENVIRONMENT === "staging"`. `ownerCore()` uses the token's `common_name` as the subject. Production and local keep today's rule. The policy comment and the `policy.test.ts` and `core.test.ts` cases change with it: staging allows, production still refuses.

*Why it is safe:* staging holds no sign-in-list key and makes no Cloudflare call, its people are practice data that each preview check reseeds, and the environment name is committed config, not something a request can set. The same token on the live app still gets `owner_required`.

*Instead of* a second, owner-flavoured token: one more secret to mint, store and rotate, for the same reach.

## Risks / Trade-offs

- [The checker no longer sees the non-owner view on a preview] → `Own.tsx` keeps its code tests, and its new look is checked there; the walk says so.
- [No built app here uses a saved key, so a preview can't show a key under an app] → `PersonPage.test.tsx` and `Roles.test.tsx` cover it with the Stripe and Bank fixtures; the report names it as shown in tests only.
- [A leave question on every stray tap would annoy] → it shows only when the page's state differs from where it started.
- [An install that named its staging environment differently] → the rule reads the same `WONG_ENVIRONMENT` value setup writes; anything else behaves as today.

## UX

### Use-case brief

The owner of a small business, at a desk or on a phone, a few times a month: *give this person the app they need and let it do its job*, and *check what someone can do*. Done is a saved person or role whose apps work, with no gap line left. Common case: one person, one or two apps, one level raised. Edge cases: a key shared by two apps, a key that works with no app, a role held by many. The closest existing screen is the person page itself; this change regroups it, phone-first.

### Flow

People → *Edit* → tick the app → pick the level under it → *Save access* → back on People with a *Saved* box and the person's labels updated. Nothing in the common case needs a scroll to a second list. A key no app uses is one group further down the same page.

### Hierarchy

- **Lists:** the name is the loudest thing; sign-in status sits muted beside it; labels carry the answer; a gap line is the one accented item. *Add person* / *Add role* stays the one filled button.
- **Pages:** *Save access* / *Save role* is the one filled button. App names carry weight; `uses …` and hints are muted; pickers sit indented under their app.

### Review

[review.html](review.html) sketches each screen in the proposal's What Changes: the person and role page under *An app's keys sit under its tick*, the People and Roles lists under *People and Roles show apps and levels as labels*, the Keys list under *Apps and Keys group who has what by level*, the non-owner box under *Your own view uses the same labels*, and the save and leave states under *A save you can't miss*.

### Components

Existing: `View`, `Page`, `SetFields`, `LevelChoice`, `Confirm`, `Notices`, `CopyText`. New: `Labels`, because five screens show the same chips.

<!-- end design.md -->
<!-- file tasks.md utf8 3628 -->
# Tasks

## 1. Person and role pages

- [x] 1.1 In `SetFields.tsx`, show each ticked app's key levels under its tick, a short `uses …` beside an unticked app, and a second group for keys no ticked app uses; verify by reading the rendered groups in `PersonPage.test.tsx`.
- [x] 1.2 Make a key shared by two ticked apps show under both, in step, with a line saying the level is shared, and turn the gap line into a hint that names the fix; add cases to `PersonPage.test.tsx` and `Roles.test.tsx` for: tick gives Read, raise under the app saves Read & write, the shared key follows, an unticked app hides its picker.
- [x] 1.3 Update the existing person and role tests that find a key by the old Keys group; verify no test is skipped or deleted without a moved equivalent.

## 2. Lists and the non-owner box

- [x] 2.1 Add `Labels.tsx` and the array helpers and `gaps()` in `levels.ts`, and `holdersByLevel()` in `subjects.ts`; delete dotted-line helpers left without a caller; cover the new helpers in `levels.test.ts` and `subjects.test.ts`.
- [x] 2.2 Use labels in `People.tsx` and `Roles.tsx`, with the role name or *Own set*, the sign-in status beside the name, and one gap line per app that can't do its job; assert them in `App.test.tsx` and `Roles.test.tsx`.
- [x] 2.3 Group holders by level in `Keys.tsx`, show holders as labels in `Apps.tsx`, and make every list button say *Edit*; assert them in `Grants.test.tsx`.
- [x] 2.4 Use labels in `Own.tsx`; assert them in `App.test.tsx`.

## 3. Save result, leaving, and look

- [x] 3.1 Show the save result in a notice box in `Owner.tsx`, as an alert when it did not finish, and drop the empty paragraph; assert both in `App.test.tsx`.
- [x] 3.2 Add the `changed` flag to `Page.tsx` and each page, asking through `Confirm` on the back link, *Cancel* and the view switch, with `beforeunload` and `useBlocker` where a data router is present; test that staying keeps the change and that an untouched page leaves at once.
- [x] 3.3 Style the labels, the gap line, the nested pickers, the two groups and the level picker in `Access.css`; extend `style.test.ts` so labels wrap and a gap is marked by more than colour, loosening none of its checks.

## 4. The checker on previews

- [x] 4.1 In `policy.ts` and `core.ts`, count the checker as the owner when `WONG_ENVIRONMENT` is `staging`, with the token's `common_name` as subject; add `policy.test.ts` and `core.test.ts` cases: staging allows a read and a save, production refuses both, local is unchanged.
- [x] 4.2 Check `schema/seed.sql` gives the practice list what the walk needs (a role held by two people, an own-set person, a person with no level) and add a row only if one is missing; verify with `seed.test.ts`.

## 5. Docs and release

- [x] 5.1 Update `wiki/stack/employee-access.md`: *Four views* for the new page layout and labels, and the checker's reach on previews where it says the token never manages people; verify with `node scripts/check-payload-links.mjs`.
- [x] 5.2 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand; verify `node .github/scripts/checks.mjs --worktree` passes.

## 6. Verification

- [x] 6.1 Run the app's test chain (`npm test` in `app/`) and the worktree checks; fix what fails.
The preview walk is the publish step's own check, not a box here: walk the preview as the checker through People, a person's page, a role's page, Apps, Keys, a save with its *Saved* box, and the leave question; show the pictures, and name what only code tests cover (a key under an app, the shared key, the non-owner box).

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 2542 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Current app grants govern business access everywhere

Current employee grants SHALL govern app lists, direct app visits, associated described and bare API routes, and assistant discovery/calls. Server authorization SHALL apply before business work, preserve stricter existing action and record checks, and deny unavailable or unmapped policy. Client state, existing login, cached descriptions and repository access SHALL grant no extra permission. The installation's verification service token SHALL keep every built app on previews and the live app, as before permissions started. On a preview it SHALL be able to open and save the employer's Access screens against the practice list; on the live app it SHALL never manage people. Acknowledged grant removal SHALL deny subsequent requests; work already admitted SHALL not be claimed undone.

#### Scenario: An employee calls a hidden app API

- **WHEN** an employee assigned Orders but not Payroll calls Payroll directly with a valid session
- **THEN** the server denies Payroll before business work while Orders remains available

#### Scenario: The verification machine checks a preview

- **WHEN** the verification service token opens an app page or calls its API on a preview after permissions have started
- **THEN** the request is allowed, and it can open the employer's Access screens and save a change to the practice list

#### Scenario: An assigned app is removed during a session

- **WHEN** app deselection is acknowledged and the employee sends their next request with the same valid session
- **THEN** that app's request is denied without needing logout or changing other app grants

#### Scenario: The verification machine tries to manage people on the live app

- **WHEN** the verification service token sends a people-management request to the live app
- **THEN** it is denied and nobody's access changes

## ADDED Requirements

### Requirement: Access never loses an unsaved change silently

Access SHALL tell the employer plainly whether a save finished, where they land after it. When the employer leaves a person's, role's, app's or key's page with changes not yet saved, Access SHALL ask before the changes are dropped, and SHALL keep them when the employer chooses to stay.

#### Scenario: The employer leaves with unsaved changes

- **WHEN** the employer changes a level on a person's page and opens another view without saving
- **THEN** Access asks whether to leave, and staying keeps the change on the page

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 1304 -->
# Spec Delta

## ADDED Requirements

### Requirement: Access sets an app's key levels beside the app and shows each gap

On a person's page and a role's page, Access SHALL show the level of each key an app uses beside that app once the app is ticked, so the employer gives the app and sets the level in one place. A key that several ticked apps use SHALL remain one level, shown the same beside each. A key no ticked app uses SHALL still be settable on the same page. The People and Roles lists SHALL show each person's and role's apps and key levels as separate items with the level in words, and SHALL say where a held level is below what one of their apps does. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer ticks an app that changes things with Stripe on a person's page, picks Read & write beside that app and saves
- **THEN** the person has the app and Stripe: Read & write, and every other ticked app that uses Stripe shows the same level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list says that app can look up but not change, without the employer opening the person's page

<!-- end specs/key-access/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 50241 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-05-easier-access-screen</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-05-easier-access-screen">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-easier-access-screen</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Access now sets Read or Read &amp; write for each saved key, but giving someone an app and the right level takes two lists and a scroll, and every list is one long dotted line, so you can't tell at a glance who has what. The assistant also could not check your screens on a preview last time, because the checker never signs in as you.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>An app's keys sit under its tick.</b> On a person's page and a role's page, ticking an app shows the level of each key it uses right there, so you give the app and pick the level in one place. Ticking still gives Read, never Read &amp; write. A key two ticked apps share shows under both and is one level: change it under one and the other follows. Keys no ticked app uses, such as Cloudflare look-ups, sit in a short list below. An app's own page and a key's own page keep their layout.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ ← People                           │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ kim@shop.com · Can sign in         │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Role [Their own set ▾]             │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ Apps                               │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│  [x] Hello                         │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│      uses Stripe: look up, change  │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│      can look up, not change       │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│  [ ] Payroll                       │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│      uses Bank: look up, change    │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│ Keys                               │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│  Stripe  (None)(•Read)(Read&amp;write) │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│  Bank    (•None)(Read)(Read&amp;write) │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│  Cloudflare  (None)(•Read)         │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│ [Save access] [Cancel]             │</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-19" tabindex="0">AFTER</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">│ ← People                           │</span>
<span class="ln" data-note="item-1-line-22" tabindex="0">│ kim@shop.com · Can sign in         │</span>
<span class="ln" data-note="item-1-line-23" tabindex="0">│ Role [Their own set ▾]             │</span>
<span class="ln" data-note="item-1-line-24" tabindex="0">│ Apps                               │</span>
<span class="ln" data-note="item-1-line-25" tabindex="0">│  [x] Hello                         │</span>
<span class="ln" data-note="item-1-line-26" tabindex="0">│     +Stripe (None)(•Read)(R&amp;write) │</span>
<span class="ln" data-note="item-1-line-27" tabindex="0">│     +Hello also changes things.    │</span>
<span class="ln" data-note="item-1-line-28" tabindex="0">│      Pick Read &amp; write to let it.  │</span>
<span class="ln" data-note="item-1-line-29" tabindex="0">│  [ ] Payroll · uses Bank           │</span>
<span class="ln" data-note="item-1-line-30" tabindex="0">│  [x] Tip calculator · no keys      │</span>
<span class="ln" data-note="item-1-line-31" tabindex="0">│ +Keys no ticked app uses           │</span>
<span class="ln" data-note="item-1-line-32" tabindex="0">│  Cloudflare  (None)(•Read)         │</span>
<span class="ln" data-note="item-1-line-33" tabindex="0">│    look-ups, no app needed         │</span>
<span class="ln" data-note="item-1-line-34" tabindex="0">│  Bank  (•None)(Read)(Read&amp;write)   │</span>
<span class="ln" data-note="item-1-line-35" tabindex="0">│ [Save access] [Cancel]             │</span>
<span class="ln" data-note="item-1-line-36" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>People and Roles show apps and levels as labels.</b> Each person and role lists its apps and its key levels as small labels, one per app and one per key, with the level written in words. A line marked with <code>!</code> says where an app can't do its job yet, such as <i>Hello can look up, not change</i>, so you see a gap without opening the page. A person with a role shows the role's name; one without shows <i>Own set</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ kim@shop.com                       │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Can sign in                        │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ Hello, Tip calculator · Stripe:    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ Read · Cloudflare: Read            │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ [Edit] [Remove]                    │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-2-line-10" tabindex="0">AFTER</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ kim@shop.com         Can sign in   │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ Own set                            │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│ Apps [Hello] [Tip calculator]      │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">│ Keys [Stripe Read] [Cloudflare     │</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│      Read]                         │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ +! Hello can look up, not change   │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ [Edit] [Remove]                    │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Apps and Keys group who has what by level.</b> A key lists who has Read &amp; write and who has Read on separate lines. An app lists who has it the same way as labels. Every list uses <i>Edit</i> for its button, where three of them said <i>Change</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Stripe                     Saved   │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Used by Hello: look up, change     │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ Office: Read &amp; write · Sales:      │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ Read · kim@shop.com: Read          │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ [Change]                           │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-3-line-10" tabindex="0">AFTER</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">│ Stripe                     Saved   │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">│ Used by Hello: look up, change     │</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">│ +Read &amp; write  Office              │</span>
<span class="ln" data-note="item-3-line-15" tabindex="0">│ +Read          Sales, kim@shop.com │</span>
<span class="ln" data-note="item-3-line-16" tabindex="0">│ [Edit]                             │</span>
<span class="ln" data-note="item-3-line-17" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Your own view uses the same labels.</b> Someone who is not the owner sees their apps and levels as labels too.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ You can use                        │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ Hello · Tip calculator             │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Cloudflare: Read                   │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-4-line-8" tabindex="0">AFTER</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│ You can use                        │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">│ Apps [Hello] [Tip calculator]      │</span>
<span class="ln" data-note="item-4-line-12" tabindex="0">│ Keys [Cloudflare Read]             │</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A save you can't miss, and no change lost by accident.</b> After a save, the list opens with a <i>Saved</i> box at the top, or a box that says the save did not finish. Leaving a page with changes you have not saved asks first. The level picker and the Apps and Keys groups get a tidier look; the picker stays a real set of buttons you can reach from the keyboard.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">edit ─▶ Save ─▶ list, +&quot;Saved&quot; box on top</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">  │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">  └▶ leave with changes</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">       │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">       ▼</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">  +&quot;Leave without saving?&quot;</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">   [Keep editing] [Leave]</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The checker can open your screens on previews.</b> On a preview, the assistant's checker opens and saves the owner's Access screens against the practice list, so it can click through a change and show you pictures. On the live app nothing changes: the checker keeps every app and never manages people.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">            │ preview        │ live app</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">────────────┼────────────────┼──────────</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">you (owner) │ everything     │ everything</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">the checker │ +your screens, │ apps only,</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">            │ practice list  │ no people</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> A who-has-what table. A wider page for Access. Setting a level straight from a list without opening a page. Search or filters in the lists. A change to what a level allows, to roles, or to who can sign in. Letting the checker manage people on the live app.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how far the Access screen change should go → chose to rework the editing pages and the lists, keeping the four views and their addresses, with no who-has-what table.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what bothered him when using it → chose <i>hard to see who has what</i> and <i>too many steps</i>.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether to fix that the checker could not open the owner's screens on a preview → chose to let the checker act as owner on previews only.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: labels in the lists answer <i>who has what</i> without a table, because he chose the option without one and the page stays a narrow column.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a key two ticked apps share shows under both and stays one level, because a level is the key's, not the app's, and hiding it under the second app would hide why that app works.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: an app's own page and a key's own page keep their layout, because each already sets its levels in one place.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: every list button says <i>Edit</i>, because People already does and it is the commoner word.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the checker acts as owner on staging and its previews only, not on a local run, because local runs already have their own sign-in.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this repo's previews can show the labels, the Cloudflare key, the saved box and the leave question, but not a key under an app, because no built app here uses a saved key; code tests cover that part.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build: each task's own test run moved to one final run after all code and tests were written; every acceptance check stayed.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a person with every app shows a label per app, where the list said <i>All apps</i>, because the plan asks for one label per app.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a key no ticked app uses carries no <i>nothing uses it yet</i> line, because its group's heading already says so.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the view switch stays off a person's, role's, app's and key's page, as before; the leave question covers the back link, <i>Cancel</i>, any other link, the browser's Back button, a reload and a closed tab.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the shared-level line shows under each app that shares the key, not only the second, so the first one explains itself too.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the preview walk runs as the publish step's check instead of a task box, because he chose build and publish in one go and that step walks the preview after its one save.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: built, merged with the two releases published meanwhile (the Keys view keeps their <i>Not on previews yet</i> line), numbered 33.2.0, and saved for the checks before publishing.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: the preview walk passed both walkable promises; the leave-question check is kept for future publishes, and the owner-screens walk is left out because its replay takes longer than 30 seconds.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
