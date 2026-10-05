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
