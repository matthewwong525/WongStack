<!-- openspec-archive v1 2026-10-05-access-managers -->
<!-- file proposal.md utf8 11931 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 9659 -->
# Design

## Context

See [the proposal](proposal.md) for why. Today one test decides who manages Access: `ownerCore()` in `app/worker/employee-access/core.ts` admits the verified person whose email equals `WONG_OWNER_EMAIL`, and, on staging, the verification service token. Everything else follows from it:

- `currentPolicy()` in `policy.ts` returns `role: "owner" | "employee"`. `owner` means far more than Access: every app, every key at its highest level, every unmapped route, and every `kind: "owner"` route.
- `management.ts` serves `status`, `retry` and the three saves (`people`, `roles`, `grants`) from one `Core`. `core.email` is the owner's email, used for three things: the status response, the *owner can't be changed* guard in `members.ts`, and the actor on each `wong_access_audit` row (`audit()` in `sets.ts`).
- The screen in `app/src/apps/access/` picks its side from `/api/access/apps`: `role === 'owner'` renders `Owner.tsx`, anything else `Own.tsx`.
- `schema/migrations/0003_key_levels.sql` records why a person's role is a table, not a column on `wong_access_members`: an older Worker's inserts into that table name no columns.
- Migrations apply before each deploy, to staging on a branch and to production on the default branch ([the D1 pipeline](../../../wiki/stack/d1-pipeline.md)).
- `app/tests/employee-access/connections.ts` builds its test database from an explicit list of migration files.

## Goals / Non-Goals

**Goals:** a manager passes exactly the Access management routes and nothing the owner's role gives elsewhere; every limit is enforced on the server, with the screen only mirroring it; no existing install changes until the owner ticks someone.

**Non-Goals:** a second kind of manager, per-view or per-app managing, a new route, a change to the sign-in list calls, or an audit screen.

## Decisions

### 1. Managers are rows in their own table

One additive migration adds `wong_access_managers (installation_id, email)`, keyed on both and referencing `wong_access_members`. It is named by [the pipeline's timestamp rule](../../../wiki/stack/d1-pipeline.md#timestamp-migrations-additive-and-order-independent), which sorts after the three numbered files, and joins the fixture's list in `connections.ts`.

*Instead of* a column on `wong_access_members`: the reason in `0003_key_levels.sql` still holds. *Instead of* the unused `project_editing` column there: its name promises something else, and a retired meaning read as full trust is the wrong accident to risk. *Instead of* an Access tick in the app grants: managers edit grants, so a manager could tick it for someone else.

### 2. `manages` is its own flag; the role stays as it is

`currentPolicy()` adds `manages: boolean` to its `not_started` and `current` states, read in the same SQL snapshot as the person's row. It is true for the owner role, and for a verified person whose member row is active and who has a manager row. `role` keeps its two values, so nothing that tests `role === "owner"` widens: a manager's apps and key levels are their own set or their role's, an unmapped route still refuses them, and so does a `kind: "owner"` route. The checker manages on staging, where it already counts as the owner, and never on production.

*Instead of* a third role `manager`: every `role === "owner"` test would need a reviewed answer for the new value, and a missed one fails open or shut by accident.

### 3. One gate admits the owner or a manager, and remembers which

`ownerCore()` keeps its owner and checker tests. A verified person who is neither is admitted only when the existing installation row has an active manager row for their email; otherwise `owner_required`, as today. The installation row is still created only by an owner request. `Core` gains `actor`, the acting person's email, and `owner`, whether they are the owner; `core.email` stays the owner's email. `audit()` writes `actor`, so each change names who made it.

A manager's `status` read runs the same start steps as the owner's. They take nothing away and do nothing once run, and a manager can exist only after an owner request.

### 4. The limits live in the people save

The `people` save accepts an optional `manager` boolean; left out, the person keeps what they have. In `changeMember()`:

- A request that names `manager` from anyone but the owner is refused with `owner_required`. So is a non-owner's removal of a person who is a manager, the caller included.
- The owner's own email is refused as today, for everyone.
- A removal always deletes the manager row, in the same batch, so adding the person back starts without it. `manager: true` with `removed: true` is invalid.
- `manager_added` and `manager_removed` join the audit events.

The `roles` and `grants` saves need no new guard: neither can name a manager or the owner, and a manager changing any person's set, their own included, is the trust the owner chose.

*Instead of* a separate `managers` route: the tick sits on the person's page and saves with it, and one save keeps the removal and the cleared switch in one batch.

### 5. Two responses say who manages

`/api/access/apps` adds `manages` beside `role`. The status response adds `manager` to each person and a `viewer` with the caller's email and whether they are the owner. `app/src/lib/access.ts` carries both in its schemas. The screen uses them only to choose what to draw; a hand-made request meets decision 4.

### 6. The screen reuses the owner's views

`App.tsx` renders `Own` then `Owner` for a manager, `Owner` alone for the owner, `Own` alone otherwise. `Owner.tsx` keeps its name and shows a manager one line naming the owner. `PersonPage.tsx` shows the owner a *Managing* group with the tick and the full-trust line, and shows a manager a plain line on a manager's page. `People.tsx` marks managers beside the role line, names the owner once, and leaves *Remove* off a manager's row for a manager; the owner's removal confirm adds that the person stops managing. `Notices.tsx` tells a manager that one setup step is left for the owner, with nothing to copy. `Home.tsx` is untouched: a manager's role is still `employee`.

### 7. The practice list has a manager

`schema/seed.sql` makes Dana, whose access is an own set, a manager, so a preview shows the tick, the label and the confirm text. `seed.test.ts` asserts it.

## Risks / Trade-offs

- [A manager gives themselves every app and level] → that is the trust the owner chose; the tick says so, each change is recorded under the manager's email, and unticking governs their next request.
- [A manager removes people, which signs everyone out and can't be undone] → the same confirm the owner sees; a manager can't remove a manager or the owner, so the owner can always step in.
- [The Worker runs before the table exists] → migrations apply before each deploy; a missing table makes the policy read fail, which denies and never opens.
- [A preview walk can't show a manager's own view, because the checker counts as the owner there] → `App.test.tsx`, `PersonPage.test.tsx` and the Worker tests cover it, and the report says so. The owner can try it by ticking a second address of their own that the real sign-in list admits.
- [Kept preview checks see the People list change, since Dana gains a label] → the replay's fresh look updates a check when only the page changed.
- [A new owner email set at setup belongs to a current person] → unchanged by this change: that person becomes the owner, and their old row can't be edited.

## Migration Plan

The table is additive and starts empty, so every install behaves as today until the owner ticks someone. To roll back, deploy the previous Worker: it never reads the table.

## UX

### Use-case brief

The owner of a small business, at a desk or on a phone, perhaps twice a year: *let my office manager handle who gets what*. Done is one saved tick, and a person who can open Access and add a new hire without calling the owner. The manager's job, a few times a month, is the owner's existing one: add a person, give an app, set a level. Common case: one or two managers. Edge cases: a manager editing their own access, a manager meeting another manager's row, the owner taking managing back. The closest existing screen is the person's page; the tick is one more group on it, phone-first.

### Flow

Owner: People → *Edit* → tick *Can manage Access* → *Save access* → People, with *Saved* on top and *Manager* on the person's line. Manager: opens Access → sees what they can use, then People → works as the owner does. Where a limit applies, the control is absent, not disabled: no tick, and no *Remove* on a manager's row.

### Hierarchy

- **Person's page:** *Save access* stays the one filled button. *Managing* is the last group, below apps and keys, so the common edits come first; its full-trust line reads at normal weight, not muted, because it is the warning.
- **People:** the name stays loudest; *Manager* sits beside the role line in words, not colour; the owner line is muted.
- **A manager's Access:** *You can use* first, then one line naming the owner, then the views. *Add person* is the one filled button, as for the owner.

### Review

[review.html](review.html) sketches each screen in the proposal's What Changes: the person's page for the owner and for a manager under *You choose who else manages Access*, and the People list for the owner and for a manager under *The lists show who manages*.

### Components

Existing: `Page`, `View`, `SetFields`, `Confirm`, `Notices`, `Own`, `Owner`, `Labels`. New: none; the tick is a plain labelled checkbox in an `access-group` fieldset.

<!-- end design.md -->
<!-- file tasks.md utf8 4501 -->
# Tasks

## 1. Database and server

- [x] 1.1 Add the managers table as one additive migration in `schema/migrations/`, named by the pipeline's timestamp rule, and add it to the migration list in `app/tests/employee-access/connections.ts`; verify the fixture's `database()` builds with it.
- [x] 1.2 In `policy.ts`, add `manages` to the `not_started` and `current` states, read in the same snapshot, leaving `role` as it is; add `policy.test.ts` cases: an active person with a manager row manages, a removed person, a person with no row and a service token do not, a manager's apps and key levels stay their own, a manager is still refused an unmapped route and a `kind: "owner"` route, and the checker manages on staging and not on production.
- [x] 1.3 In `core.ts`, admit a manager through the owner gate without ever creating the installation row for them, add `actor` and `owner` to `Core`, and make `audit()` in `sets.ts` write the actor; add `core.test.ts` cases: a manager gets a core with their own email as actor, a former manager and an ordinary employee get `owner_required`, and no row is created by a non-owner.
- [x] 1.4 In `members.ts`, accept `manager` on the people save with the limits in design decision 4, clear the switch on removal, and add `manager` per person and `viewer` to the status response; add `management.test.ts` cases: a manager adds a person and the sign-in list follows, edits a role, sets a level, and changes their own and another manager's set; a manager is refused making or unmaking a manager, removing a manager, removing themselves and changing the owner, with nothing written; the owner's untick refuses that person's next request; a removed manager added back is not one; each audit row names who acted.
- [x] 1.5 In `apps.ts`, add `manages` to the response for the `not_started` and `current` states; assert it for the owner, a manager and an ordinary employee in the existing response tests.

## 2. Access screen

- [x] 2.1 Carry `manages`, `manager` and `viewer` in the schemas in `app/src/lib/access.ts`; verify the existing fixtures in the Access tests still parse once updated.
- [x] 2.2 In `App.tsx` and `Owner.tsx`, show a manager what they can use, then one line naming the owner, then the four views; add `App.test.tsx` cases for the three sides: owner, manager, everyone else.
- [x] 2.3 In `PersonPage.tsx`, show the owner the *Managing* group with the tick and the full-trust line, send `manager` only from the owner, and show a manager a plain line on a manager's page with no tick; add `PersonPage.test.tsx` cases: the owner ticks and the save carries it, an untouched tick leaves the page unchanged for the leave question, and a manager's save never names `manager`.
- [x] 2.4 In `People.tsx` and `Notices.tsx`, mark managers beside the role line, name the owner once, leave *Remove* off a manager's row for a manager, add the stops-managing sentence to the owner's removal confirm, and give a manager the one-step-left-for-the-owner notice with nothing to copy; assert each in `App.test.tsx`.
- [x] 2.5 Add any style the group and the labels need to `Access.css`; verify `style.test.ts` holds it with none of its checks loosened and nothing marked by colour alone.

## 3. Practice list

- [x] 3.1 Make Dana a manager in `schema/seed.sql`; assert in `seed.test.ts` that the practice status lists Dana as one, with the same apps and key level as before.

## 4. Docs and release

- [x] 4.1 In `wiki/stack/employee-access.md`, add a *Managers* section (who picks, what a manager can and can't do, that it is full trust, that it gives no app or key) and correct each line that says only the owner manages people, roles or levels, the four views and the practice list included; verify with `node scripts/check-payload-links.mjs`.
- [x] 4.2 Add a `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and nobody is a manager until the owner ticks them; verify the entry is the first one.

## 5. Verification

- [x] 5.1 Run the app's test chain (`npm test` in `app/`) and `node .github/scripts/checks.mjs --worktree`; fix what fails.
The preview walk is the publish step's own check, not a box here: walk the preview as the checker: open Dana's page and see the tick with its full-trust line, untick and save, see *Manager* gone from Dana's line in People, then tick it back; show the pictures, and name what only code tests cover: a manager's own view and every refusal.

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 4427 -->
# Spec Delta

## ADDED Requirements

### Requirement: The employer chooses who else manages Access

The employer SHALL be able to make a current person a manager, and only the employer SHALL make or unmake one. A manager SHALL be able to do in Access what the employer can: add, change and remove people, create, change, give and remove roles, and set app grants and key levels, for any person, themselves and other managers included. A manager SHALL NOT make or unmake a manager, remove a manager, or change or remove the employer, and no screen SHALL change who the employer is. Being a manager SHALL give no app, no key level and no other employer authority by itself. Where the employer chooses a manager, Access SHALL say that a manager can give themselves any app or key level. A manager's authority SHALL be read on every request: once the employer unmakes or removes a manager, that person's next management request SHALL be refused, and a removed person added again SHALL NOT be a manager. On the live app the verification service token SHALL never be a manager.

#### Scenario: A manager adds a person

- **WHEN** a manager saves a new person's email with Orders access
- **THEN** that person is assigned Orders only and their sign-in status is reported, as it would be for the employer

#### Scenario: A manager tries to pick or remove a manager

- **WHEN** a manager sends a request that makes someone a manager, unmakes one, removes one, or changes the employer
- **THEN** it is denied and nobody's access or authority changes

## MODIFIED Requirements

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner receives the ordinary app link to share and the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: A role gives several people the same access

The employer SHALL be able to name a role holding a set of apps and key levels and give it to people. A person SHALL have one role or their own set, never both. A person with a role SHALL have exactly the role's apps and levels, and a change to the role SHALL govern each such person's next request. Moving a person from a role to their own set, or removing a role people hold, SHALL leave each person with the access they had. People who existed before roles SHALL keep their own set until the employer gives them a role. Only the employer or a manager SHALL create, change, give or remove a role, a role SHALL never make its holder a manager, and giving a role SHALL NOT change who can sign in.

#### Scenario: The employer changes a role

- **WHEN** the employer removes an app from a role two people hold and saves
- **THEN** both people's next request to that app is denied, and a person with their own set is unaffected

#### Scenario: The employer removes a role people hold

- **WHEN** the employer removes a role that two people hold
- **THEN** each keeps the same apps and key levels as their own set

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 1194 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person's line, the Stripe key's page and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

<!-- end specs/key-access/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 49731 fence=~~~ -->
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
<title>Review · 2026-10-05-access-managers</title>
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
<body data-change="2026-10-05-access-managers">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-access-managers</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today only you can add people, edit roles and set key levels in Access, so every change waits for you. You asked on 2026-10-05 to let people you trust do it too, without opening a way for anyone to take the app over.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>You choose who else manages Access.</b> A person's page gets one new tick, <i>Can manage Access</i>, that only you see and set. Right under it the page says what it means: full trust. Nothing else about the person changes, and it works for a person with a role or with their own set.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ ← People                           │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ kim@shop.com · Can sign in         │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Role [Their own set ▾]             │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ Apps                               │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│  [x] Orders                        │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│  [ ] Payroll · uses Bank           │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ [Save access] [Cancel]             │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-12" tabindex="0">AFTER (you, the owner)</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│ ← People                           │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│ kim@shop.com · Can sign in         │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│ Role [Their own set ▾]             │</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">│ Apps                               │</span>
<span class="ln" data-note="item-1-line-18" tabindex="0">│  [x] Orders                        │</span>
<span class="ln" data-note="item-1-line-19" tabindex="0">│  [ ] Payroll · uses Bank           │</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">│ +Managing                          │</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">│ +[x] Can manage Access             │</span>
<span class="ln" data-note="item-1-line-22" tabindex="0">│ +Full trust. A manager can add and │</span>
<span class="ln" data-note="item-1-line-23" tabindex="0">│ +remove people and give anyone,    │</span>
<span class="ln" data-note="item-1-line-24" tabindex="0">│ +themselves included, any app or   │</span>
<span class="ln" data-note="item-1-line-25" tabindex="0">│ +key level.                        │</span>
<span class="ln" data-note="item-1-line-26" tabindex="0">│ [Save access] [Cancel]             │</span>
<span class="ln" data-note="item-1-line-27" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-29" tabindex="0">AFTER (a manager opens the same page)</span>
<span class="ln" data-note="item-1-line-30" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-31" tabindex="0">│ ← People                           │</span>
<span class="ln" data-note="item-1-line-32" tabindex="0">│ kim@shop.com · Can sign in         │</span>
<span class="ln" data-note="item-1-line-33" tabindex="0">│ +Manager · only the owner changes  │</span>
<span class="ln" data-note="item-1-line-34" tabindex="0">│ +this                              │</span>
<span class="ln" data-note="item-1-line-35" tabindex="0">│ Role [Their own set ▾]             │</span>
<span class="ln" data-note="item-1-line-36" tabindex="0">│ Apps                               │</span>
<span class="ln" data-note="item-1-line-37" tabindex="0">│  [x] Orders                        │</span>
<span class="ln" data-note="item-1-line-38" tabindex="0">│  [ ] Payroll · uses Bank           │</span>
<span class="ln" data-note="item-1-line-39" tabindex="0">│ [Save access] [Cancel]             │</span>
<span class="ln" data-note="item-1-line-40" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A manager does what you do in Access, with three limits.</b> A manager adds and removes people, makes and edits roles, ticks apps and sets key levels, for anyone, themselves and other managers included. A manager can't pick managers, can't remove a manager, and can't change or remove you. Who the owner is stays a setup step, with no button for it. Managing gives no app or key by itself: a manager keeps their own apps, levels and home page, and does not hold every key as you do.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">                      │ you │ manager</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">──────────────────────┼─────┼────────</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">add, remove people    │ yes │ yes</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">roles, apps, levels   │ yes │ yes</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">a manager's apps      │ yes │ yes</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">pick managers         │ yes │ no</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">remove a manager      │ yes │ no</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">change the owner      │ no  │ no</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The lists show who manages.</b> People marks each manager and names the owner in one line. A manager sees what they can use, then the same four views you see, with a line saying who the owner is. A manager's row has no <i>Remove</i> for them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ [People]  Roles  Apps  Keys        │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ [Add person]                       │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ kim@shop.com         Can sign in   │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ Own set                            │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ Apps [Orders]                      │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ [Edit] [Remove]                    │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-3-line-11" tabindex="0">AFTER (you, the owner)</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">│ [People]  Roles  Apps  Keys        │</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">│ +Owner: matt@shop.com              │</span>
<span class="ln" data-note="item-3-line-15" tabindex="0">│ [Add person]                       │</span>
<span class="ln" data-note="item-3-line-16" tabindex="0">│ kim@shop.com         Can sign in   │</span>
<span class="ln" data-note="item-3-line-17" tabindex="0">│ Own set +· Manager                 │</span>
<span class="ln" data-note="item-3-line-18" tabindex="0">│ Apps [Orders]                      │</span>
<span class="ln" data-note="item-3-line-19" tabindex="0">│ [Edit] [Remove]                    │</span>
<span class="ln" data-note="item-3-line-20" tabindex="0">└────────────────────────────────────┘</span>

<span class="ln" data-note="item-3-line-22" tabindex="0">AFTER (Kim, a manager)</span>
<span class="ln" data-note="item-3-line-23" tabindex="0">┌────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-24" tabindex="0">│ You can use                        │</span>
<span class="ln" data-note="item-3-line-25" tabindex="0">│ Apps [Orders]                      │</span>
<span class="ln" data-note="item-3-line-26" tabindex="0">│ +You manage Access. The owner,     │</span>
<span class="ln" data-note="item-3-line-27" tabindex="0">│ +matt@shop.com, picks managers.    │</span>
<span class="ln" data-note="item-3-line-28" tabindex="0">│ [People]  Roles  Apps  Keys        │</span>
<span class="ln" data-note="item-3-line-29" tabindex="0">│ [Add person]                       │</span>
<span class="ln" data-note="item-3-line-30" tabindex="0">│ kim@shop.com         Can sign in   │</span>
<span class="ln" data-note="item-3-line-31" tabindex="0">│ Own set · Manager                  │</span>
<span class="ln" data-note="item-3-line-32" tabindex="0">│ Apps [Orders]                      │</span>
<span class="ln" data-note="item-3-line-33" tabindex="0">│ [Edit]                             │</span>
<span class="ln" data-note="item-3-line-34" tabindex="0">│ lee@shop.com         Can sign in   │</span>
<span class="ln" data-note="item-3-line-35" tabindex="0">│ Sales                              │</span>
<span class="ln" data-note="item-3-line-36" tabindex="0">│ Apps [Orders] [Payroll]            │</span>
<span class="ln" data-note="item-3-line-37" tabindex="0">│ [Edit] [Remove]                    │</span>
<span class="ln" data-note="item-3-line-38" tabindex="0">└────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Taking it back works at once.</b> Untick it and the person's next click in Access is refused, with no sign-out; they keep their apps and levels. Removing a manager also ends their managing, and adding them back later does not bring it back.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">person ── you tick ───▶ manager</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">  ▲                       │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">  ├──── you untick ───────┤</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">  │                       │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">removed ◀── you remove ───┘</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">(added back: not a manager)</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>You can try it on a preview.</b> The practice list starts with one manager, so you can see the tick and the labels there. As on every preview, the real sign-in list is not touched.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Managers picking managers. Holding a manager to the apps and levels they have themselves. A button that changes the owner. Managing as part of a role. A screen that shows who changed what; the app records the person behind each change and shows it nowhere yet. Giving a manager the project's code, memory, or every key. Making previews hold the read-only Cloudflare key, which is a separate piece of work.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked who picks managers and how much a manager can do in Access → chose that only the owner picks, and a manager does everything else in Access, as full trust the screen states.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what one manager can do to another manager, or to themselves → chose change apps and levels, not remove; only the owner removes a manager or switches managing off.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: managing is a switch on a person, never part of a role, because a manager can edit roles, and a role that carried it would let a manager pick managers.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: managing gives no app or key by itself, and a manager keeps their own home page, because a manager can already give themselves what they need and it then shows on the list.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a removed person stops being a manager and does not get it back when added again, because coming back should not quietly restore full trust.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: unticking governs the manager's next click with no sign-out, because that is how lowering a key level already works.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: People names the owner in one line, because a manager needs to know who picks managers and whom to ask.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the tick has no extra confirm box, because the full-trust line sits right under it and the page still needs <i>Save access</i>.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a manager who meets the unfinished-setup notice reads that one step is left for the owner, with no request to copy, because that step needs the owner's Cloudflare token.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a preview walk shows the owner's side only, and code tests cover the manager's own view, because the checker counts as the owner on a preview and can't sign in as a second person.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: no screen for who changed what, because nobody asked for one; the record of each change now names the person who made it.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: previews holding the read-only Cloudflare key stays out, because the request said to plan only this part.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what to do with the finished plan → chose build and publish in one go.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the preview walk runs as the publish step's check instead of a task box, because he chose build and publish in one go and that step walks the preview after its one save.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: each task's own check ran once, together, after all the code and tests were written, because the build runs its checks at the end.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: when the app can't read its permission data, a signed-in person who is not the owner is told Access is unavailable, where before they were told only the owner may do this, because the app can't tell a manager from anyone else without reading it; they are refused either way, and a machine is still refused before anything is read.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the tick is sent only when the owner changed it, because a save that leaves it out keeps what the person has.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: in Keys, a manager who meets the missing read-only key reads that the owner finishes it, with nothing to copy, because the same step needs the owner's Cloudflare token as the notice on People.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: built, brought up to date with main, numbered 33.3.0, and saved for the checks before publishing; one new test that raced the list's reload after a save now waits for the list.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archive checkpoint: the preview walk passed the owner's side (tick, untick, tick back, and adding a person); the add-a-person check is kept for future publishes, and a manager's own view and every refusal stay covered by code tests only, because a preview has no second sign-in.</li>
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
