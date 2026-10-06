# Design

## Context

See proposal.md for why. What exists, as of 35.2.0:

- `codeSource(env)` in `app/worker/employee-access/code.ts` returns where the project is kept, or `null`. `null` covers two different cases: `WONG_CODE_REPOSITORY` names a GitHub `owner/name` and `WONG_CODE_READ` is empty, or no usable repository is recorded at all.
- `keyCatalogue` in `key-catalogue.ts` builds the key list in the Access status. The `code` key's `saved` is `codeSource(env) !== null`; its `setup` is false, so an unsaved one reads *Ask your assistant for the key link.* in `KeyPage.tsx`.
- `SetFields.tsx` renders a person's or a role's set. A key no ticked app uses falls into the group *Keys no ticked app uses* as a `LevelChoice`; for `code` that is None or Read. `PersonPage.tsx` adds *A new person starts with no apps. Project code is shared separately.*
- `FinishStep` in `Notices.tsx` is the existing pattern for a step handed to the assistant: the words to say, then `CopyText` with the full request, `FINISH_REQUEST` from `status.ts`.
- `projectCode()` in `provision.mjs` returns `{ status: 'missing', kept: 'github', key, url, steps }` and pushes `CODE_KEY_TODO` into the report's `todo`. `references/cloudflare.md` tells setup to say a closing line while `codeKey` is `missing`.

## Goals / Non-Goals

**Goals:**

- The key is asked for where the project is given, and nowhere before.
- Giving the project is a tick on the page an owner already has open.
- One component says the step, wherever Project code is given.

**Non-Goals:**

- No change to `codeSource`, `codeState`, the Git pass-through, the bootstrap, or the Connect popup.
- No new route, table, secret or key registry entry; `code` keeps its id, title and single level.
- No chat action that gives Project code.

## Decisions

**The status says why the project can not be handed out.** Add `project: 'ready' | 'key' | 'setup'` to the Access status, from a new `codeStep(env)` beside `codeSource`: `ready` when `codeSource` is not null; `key` when the repository matches the GitHub shape and no token is held; `setup` otherwise. The screen needs it to pick its words, and it leaks nothing: both inputs are a committed name and a yes-or-no. Alternative: one generic line (*the app can't hand the project out yet*) with no new field. Rejected: the owner asked for the GitHub key to be named at this moment, and an older install needs a different step.

**`saved` stays as it is.** The key list's `saved` for `code` already equals `project === 'ready'`. The new field adds the reason; nothing reads `saved` differently.

**One `ProjectStep` component.** It takes `status` and renders nothing when `project` is `ready`. For `key`: the owner gets *One step first. The app needs a read-only GitHub key to hand the project out. Ask your assistant:* with the quoted words *Let teammates install the project* and `CopyText` of a new `PROJECT_REQUEST`; a manager gets *One step first for the owner. {ownerEmail} adds a read-only GitHub key.* For `setup`: the existing `FinishStep plain` for the owner, and the owner's-step line for a manager. `SetFields` shows it under the tick while the tick is on; `KeyPage` shows it for `code` in place of the generic key-link line. It shows on previews too: `secrets:push` loads the key into both apps.

**`PROJECT_REQUEST` names the owning page.** `Let teammates install the project: the app needs its read-only key for this project. Send me the key link for WONG_CODE_READ with the steps in wiki/stack/employee-project.md, then load it into the app.` The assistant follows the wiki's existing five steps; the request adds no second copy of them. `FinishStep` gains optional `say` and `request` props so the one layout serves both requests.

**The tick is the `code` key's level.** In `SetFields`, `code` leaves `rest` and renders in its own `Group` with legend *Project*: a `Tick` bound to `set.keys.code === 'read'`, writing `'read'` or `null`. The saved shape and every server check are untouched, and Keys shows the same choice. A set under a role still reads *From the X role* with labels; the tick is on the role's own page. The group shows only when the status lists a `code` key.

**The setup script keeps the report, drops the to-do.** `projectCode()` still returns `codeKey` with `status: 'missing'` and the steps, so *Finish Access setup* and the new request both have them. It no longer pushes `CODE_KEY_TODO`, and the constant is removed. The to-do for a missing `WONG_CODE_REPOSITORY` stays: that one is setup's to fix. Alternative: keep the to-do and only drop the closing line. Rejected: an agent reading `todo` would still send the link at setup.

## UX

### Use-case brief

The owner, or a manager, adding a teammate or opening one, at a desk or on a phone. The job: this person should be able to work from the project on their own computer. Done is the teammate running Connect and getting the project. Common case: a project kept in Cloudflare, or a GitHub one whose key is saved, where the tick is all there is. Edge case: the first teammate on a GitHub project. Frequency, assumed: a person is added a few times a year; the key step happens once per install. Closest existing screen: the *Managing* group on the same page, a tick with its meaning right under it.

### Flow

Add person → email → tick *Can install the project* → Save access. With no key: the step appears under the tick, the owner copies the request, saves anyway, and pastes it to their assistant. No second screen, no return trip.

### Hierarchy

*Save access* stays the one solid button. The tick is at the weight of an app's tick. Its one-line meaning is muted. The step is plain text with an outline copy button, shown only when it applies.

### Review

[review.html](review.html). The What Changes items *A person's page has one tick* and *Ticking it asks for the key* sketch the page before, after, and with the step showing.

### Components

Existing parts only: `Group`, `Tick`, `FinishStep`, `CopyText`.

## Risks / Trade-offs

- [An owner saves the tick and never does the key step] → The person's Connect stays apps-only, as today; the step shows again each time that person or Project code is opened.
- [An update no longer raises the key, so a GitHub install with teammates waiting may not notice] → Installs updated to 35.1.0 were already asked once by that release's update note; Keys still shows *Not saved yet*.
- [A stale preview or cached page reads a status with no `project` field] → the schema defaults it from the `code` key's `saved`: `ready` when saved, else `key`.

## Migration Plan

Nothing to migrate. Rolling back restores the level choice and the closing line; saved access is unchanged either way.
