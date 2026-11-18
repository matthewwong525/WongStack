<!-- openspec-archive v1 2026-10-06-ask-for-project-key-in-access -->
<!-- file proposal.md utf8 8169 -->
# Ask for the project key when you share the project

**Status:** ready-to-ship

**Branch:** github-token-setup

**Open questions:** none

## Why

On a project kept in GitHub, the app needs a read-only GitHub key before it can put the project on a teammate's computer. Today setup mentions that key in its last message, when most owners have no teammate yet, and never brings it up again. Later, giving someone the project is hidden under *Keys* as *Project code*, and nothing there says the key is still missing.

## What Changes

- **Setup stops mentioning the key.** Its closing message loses the line *"One step is left before teammates can install the project"*. An update stops listing it as a to-do too. You are asked the first time you let someone install the project, and never if you work alone. A project kept in Cloudflare needs no key and was never asked.
  ```text
    BEFORE                  AFTER
  setup ends              setup ends
    │                       │
    ▼                       ▼
  "one step left:         (nothing)
   a GitHub key"
                          you let Sam
  you let Sam             install the project
  install the project       │ no key yet
    │                       ▼
    ▼                     +"one step first"
  (nothing said)          +the request to copy
  ```
- **A person's page has one tick: *Can install the project*.** It replaces the *None / Read* choice for *Project code* that sat under *Keys no ticked app uses*, and the sentence *Project code is shared separately*. It is off for a new person. A role's page has the same tick, so a whole role can get the project. *Keys* still lists *Project code*, and a tick here is the same choice as *Read* there.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐ ┌────────────────────────┐
  │ Add person             │ │ Add person             │
  │ Email [             ]  │ │ Email [             ]  │
  │ Role  [Their own set▾] │ │ Role  [Their own set▾] │
  │                        │ │                        │
  │ Apps                   │ │ Apps                   │
  │ [ ] Hello              │ │ [ ] Hello              │
  │                        │ │                        │
  │ Keys no ticked app uses│ │+Project                │
  │ Project code           │ │+[ ] Can install the    │
  │ (•) None  ( ) Read     │ │+    project            │
  │                        │ │+Puts the project on    │
  │ A new person starts    │ │+their computer, to     │
  │ with no apps. Project  │ │+read and use.          │
  │ code is shared         │ │                        │
  │ separately.            │ │ A new person starts    │
  │                        │ │ with no apps.          │
  │ [Save access] [Cancel] │ │ [Save access] [Cancel] │
  └────────────────────────┘ └────────────────────────┘
  ```
- **Ticking it asks for the key when the app still needs one.** Right under the tick the page says one step comes first, and gives you the words to say to your assistant, with a button to copy the full request. Your assistant then sends the private link with the five GitHub steps. You can save the tick straight away: the person gets the project as soon as the key is in. A manager reads that the step is the owner's, with nothing to copy. *Project code* opened from *Keys* shows the same step.
  ```text
  ┌──────────────────────────────────────┐
  │ Project                              │
  │ [x] Can install the project          │
  │                                      │
  │ +One step first. The app needs a     │
  │ +read-only GitHub key to hand the    │
  │ +project out. Ask your assistant:    │
  │ +"Let teammates install the project" │
  │ +[Copy that request]                 │
  │                                      │
  │ [Save access] [Cancel]               │
  └──────────────────────────────────────┘
  ```
- **The step names what is really missing.** On an older install that has not yet told the app which project it hands out, the page says to finish Access setup, not to make a GitHub key. Once the app can hand the project out, the tick shows with nothing under it.

**Non-goals:** no change to who holds the project at the start (only the owner), to how a device downloads it, to publishing, or to the *Project code* name in *Keys*. Giving the project stays a choice made in Access; the assistant gains no way to give it from chat.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: Project code is also given by one tick on a person's and a role's page, and the page where it is given names the step left while the app can not hand the project out.
- `cloudflare-provisioning`: on a GitHub install, setup and the Access step report the read-only key as missing with its steps and no longer raise it as a to-do or a closing line.

## Impact

- `app/worker/employee-access/` — the Access status says why the project can not be handed out yet: a missing key, or no project recorded.
- `app/src/apps/access/` — `SetFields.tsx`, `PersonPage.tsx`, `KeyPage.tsx`, `Notices.tsx`, `status.ts`, `levels.ts` and their tests; `app/src/lib/access.ts` for the new status field.
- `.agents/skills/wong-setup/` — `scripts/provision.mjs` and `references/cloudflare.md`; `scripts/tests/provision.test.mjs`.
- `wiki/stack/employee-project.md`, `wiki/stack/employee-access.md`, `wiki/people/matthew-wong.md`, `CHANGELOG.md` (a `minor` entry).
- No new key, table, route or dependency. Saved access keeps its shape.

## Decision log

- **2026-10-06** — Asked whether setup should keep its closing line about the read-only GitHub key → chose to drop it.
- **2026-10-06** — Asked whether to plan a tick on the person's page, with the key asked for beside it → chose to plan it.
- **2026-10-06** — Assumed: an update stops raising the key as a to-do as well, because the same reasoning holds: an owner with no teammate has no use for it, and Access now asks at the right moment.
- **2026-10-06** — Assumed: the tick is on a role's page too, because a person's and a role's set share one form and a role is how several people get the same access.
- **2026-10-06** — Assumed: *Project code* keeps its name and its row in *Keys*, because renaming a key touches the Connect card, the specs and installs' own notes for no gain to this change.
- **2026-10-06** — Assumed: the tick can be saved before the key arrives, because Access already saves a level for a key that is not saved, and making the owner come back to tick it again is a second trip.
- **2026-10-06** — Assumed: the page tells a missing GitHub key apart from a project not recorded yet, because telling an owner of an older install to make a GitHub key would send them to the wrong step.
- **2026-10-06** — Assumed: the step shows on previews as on the live app, because loading the key gives it to both.
- **2026-10-06** — Assumed: the assistant gets no way to give the project from chat, because Access has no chat action for people today and adding one is a separate change.
- **2026-10-06** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-06** — Assumed: the tick's detail lives on the assistant-connection wiki page and the Access page only links it, because the Access page sits at its 3,000-word cap; six of its existing sentences were shortened to fit one new line.
- **2026-10-06** — Archive checkpoint: built, walked on the preview with verdict SUCCESS, merged with 36.0.1 and numbered 36.1.0. The step under the tick was not shown on the preview, which holds the key; unit tests cover it.

<!-- end proposal.md -->
<!-- file design.md utf8 6728 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 4895 -->
# Tasks

## 1. The app says why the project can't be handed out

- [x] 1.1 Confirm the checkout holds 35.2.0 or later: `VERSION`, and `app/src/apps/access/KeyPage.tsx` exists. If not, stop and report it. Verify by reading both.
- [x] 1.2 Add `codeStep(env)` to `app/worker/employee-access/code.ts`: `ready`, `key` (a GitHub `owner/name` with no token) or `setup` (anything else). Cover it in `code.test.ts`: a Cloudflare-kept project, GitHub with a token, GitHub without, no repository, a malformed name. Verify the new cases pass.
- [x] 1.3 Put `project` in the Access status where `keyCatalogue` is used, and in `statusSchema` in `app/src/lib/access.ts`, defaulting from the `code` key's `saved` when the field is absent. Cover the field in the Worker's management test and the default in a schema test. Verify both pass, and that no secret's value or name is in the status.

## 2. Access gives the project with one tick

- [x] 2.1 In `status.ts` add `PROJECT_REQUEST`; give `FinishStep` in `Notices.tsx` optional `say` and `request` props; add `ProjectStep` (owner and manager, `key` and `setup`, nothing when `ready`). Cover it in `status.test.ts` or a new `ProjectStep` test: each of the five outcomes, and that the copied text is `PROJECT_REQUEST`. Verify they pass.
- [x] 2.2 In `SetFields.tsx`, take `code` out of *Keys no ticked app uses* and render the *Project* group: the tick *Can install the project*, its muted line, and `ProjectStep` while the tick is on. Hide the group when the status lists no `code` key, and hide *Keys no ticked app uses* when nothing is left in it. Remove *Project code is shared separately.* from `PersonPage.tsx`. Update `PersonPage.test.tsx` and `Roles.test.tsx`: a new person's tick is off; ticking it saves `code: 'read'`; unticking saves none; the step shows only with the tick on and `project` not `ready`; a manager sees no copy button; a role's page has the same tick. Verify they pass.
- [x] 2.3 In `KeyPage.tsx`, show `ProjectStep` for the `code` key in place of *Ask your assistant for the key link.* Update `Grants.test.tsx`. Verify it passes, and that another unsaved key still reads the key-link line.
- [x] 2.4 Update `wiki/stack/employee-access.md` (*Give an app and its level in one place*: the tick, and the step under it) and `wiki/stack/employee-project.md` (*Who gets what*: where the project is given; *The owner's one step on GitHub*: Access asks for it, setup does not; keep the heading's exact text). Verify `node scripts/check-payload-links.mjs` passes.

## 3. Setup stops asking

- [x] 3.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, stop pushing `CODE_KEY_TODO` in `projectCode()`, remove the constant, and fix the function's comment and the `access` help text. Update `scripts/tests/provision.test.mjs`: every case that expected `CODE_KEY_TODO` now expects it absent, `codeKey` still carries `status: 'missing'` with its steps on GitHub, and the missing-repository to-do is unchanged. Verify `node --test scripts/tests/provision.test.mjs` passes.
- [x] 3.2 In `.agents/skills/wong-setup/references/cloudflare.md`, delete the closing-report line about the read-only GitHub key, and reword *The project Connect hands out*: on GitHub the key is asked for in Access, and setup says nothing. Verify `node scripts/measure-context.mjs --check` passes and a search of `.agents/` and `wiki/` finds no *One step is left before teammates*.

## 4. The release and the person page

- [x] 4.1 Add `## Next (minor) — The project key is asked for when you share the project` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand; a GitHub install with no key is asked in Access the first time someone is given the project. Verify `node scripts/check-retired-names.mjs` passes.
- [x] 4.2 Add to `wiki/people/matthew-wong.md`: ask for a key when it is first needed, not during setup. Verify the page stays linked from `wiki/people/README.md`.

## 5. Verification

- [x] 5.1 From `app/`, run `npm test` and `npm run build:app`. Verify both pass with coverage, dead-code and duplicate checks green.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes.
- [x] 5.3 Run `openspec validate "ask-for-project-key-in-access" --strict --no-interactive`. Verify it reports valid.
- [x] 5.4 `/save`, then walk the preview at a computer width and a phone width: *Add person* shows the *Project* tick, off, with no *Project code is shared separately*; ticking it on a preview that holds no key shows the step with a working copy button; *Project code* opened from *Keys* shows the same step; a saved tick shows as *Read* in *Keys*. Verify with the walk's verdict in the pull request. Walked on 2026-10-06, verdict SUCCESS, in the pull request's walkthrough comment; the preview holds the key, so the step under the tick was not shown there and rests on the unit tests.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1598 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the app to that repository, so no key is made or pasted. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, and SHALL report it as missing with its numbered steps. They SHALL NOT raise that key as a to-do, and setup's closing report SHALL NOT mention it: the employer is asked in Access when they first let someone install the project. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as missing with its steps, no to-do asks for it, and Connect keeps working as before for everyone

#### Scenario: Setup finishes on GitHub with no teammate yet

- **WHEN** setup finishes a new GitHub install
- **THEN** its closing report says nothing about a read-only GitHub key, and the employer is not asked for one

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/key-access/spec.md utf8 2397 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Project code is a key with one level

Access SHALL list Project code among the keys, offering Read as its only level, settable per person and per role like any key and usable with no app ticked. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, off for a new person, and that tick SHALL be the same choice as Read in Keys. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a read-only key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens Keys on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no read-only key and ticks that they can install the project
- **THEN** the page says a read-only GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project on their next request

<!-- end specs/key-access/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41996 fence=~~~ -->
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
<title>Review · 2026-10-06-ask-for-project-key-in-access</title>
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
<body data-change="2026-10-06-ask-for-project-key-in-access">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-ask-for-project-key-in-access</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">On a project kept in GitHub, the app needs a read-only GitHub key before it can put the project on a teammate's computer. Today setup mentions that key in its last message, when most owners have no teammate yet, and never brings it up again. Later, giving someone the project is hidden under <i>Keys</i> as <i>Project code</i>, and nothing there says the key is still missing.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Setup stops mentioning the key.</b> Its closing message loses the line <i>&quot;One step is left before teammates can install the project&quot;</i>. An update stops listing it as a to-do too. You are asked the first time you let someone install the project, and never if you work alone. A project kept in Cloudflare needs no key and was never asked.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">setup ends              setup ends</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">  │                       │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">  ▼                       ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">&quot;one step left:         (nothing)</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> a GitHub key&quot;</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                        you let Sam</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">you let Sam             install the project</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">install the project       │ no key yet</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">  │                       ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">  ▼                     +&quot;one step first&quot;</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">(nothing said)          +the request to copy</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A person's page has one tick: <i>Can install the project</i>.</b> It replaces the <i>None / Read</i> choice for <i>Project code</i> that sat under <i>Keys no ticked app uses</i>, and the sentence <i>Project code is shared separately</i>. It is off for a new person. A role's page has the same tick, so a whole role can get the project. <i>Keys</i> still lists <i>Project code</i>, and a tick here is the same choice as <i>Read</i> there.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                    AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌────────────────────────┐ ┌────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Add person             │ │ Add person             │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Email [             ]  │ │ Email [             ]  │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ Role  [Their own set▾] │ │ Role  [Their own set▾] │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│                        │ │                        │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ Apps                   │ │ Apps                   │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ [ ] Hello              │ │ [ ] Hello              │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│                        │ │                        │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ Keys no ticked app uses│ │+Project                │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│ Project code           │ │+[ ] Can install the    │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ (•) None  ( ) Read     │ │+    project            │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│                        │ │+Puts the project on    │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│ A new person starts    │ │+their computer, to     │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">│ with no apps. Project  │ │+read and use.          │</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ code is shared         │ │                        │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ separately.            │ │ A new person starts    │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│                        │ │ with no apps.          │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">│ [Save access] [Cancel] │ │ [Save access] [Cancel] │</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">└────────────────────────┘ └────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Ticking it asks for the key when the app still needs one.</b> Right under the tick the page says one step comes first, and gives you the words to say to your assistant, with a button to copy the full request. Your assistant then sends the private link with the five GitHub steps. You can save the tick straight away: the person gets the project as soon as the key is in. A manager reads that the step is the owner's, with nothing to copy. <i>Project code</i> opened from <i>Keys</i> shows the same step.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Project                              │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ [x] Can install the project          │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ +One step first. The app needs a     │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ +read-only GitHub key to hand the    │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ +project out. Ask your assistant:    │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ +&quot;Let teammates install the project&quot; │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│ +[Copy that request]                 │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">│ [Save access] [Cancel]               │</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The step names what is really missing.</b> On an older install that has not yet told the app which project it hands out, the page says to finish Access setup, not to make a GitHub key. Once the app can hand the project out, the tick shows with nothing under it.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> no change to who holds the project at the start (only the owner), to how a device downloads it, to publishing, or to the <i>Project code</i> name in <i>Keys</i>. Giving the project stays a choice made in Access; the assistant gains no way to give it from chat.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether setup should keep its closing line about the read-only GitHub key → chose to drop it.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to plan a tick on the person's page, with the key asked for beside it → chose to plan it.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: an update stops raising the key as a to-do as well, because the same reasoning holds: an owner with no teammate has no use for it, and Access now asks at the right moment.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the tick is on a role's page too, because a person's and a role's set share one form and a role is how several people get the same access.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: <i>Project code</i> keeps its name and its row in <i>Keys</i>, because renaming a key touches the Connect card, the specs and installs' own notes for no gain to this change.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the tick can be saved before the key arrives, because Access already saves a level for a key that is not saved, and making the owner come back to tick it again is a second trip.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the page tells a missing GitHub key apart from a project not recorded yet, because telling an owner of an older install to make a GitHub key would send them to the wrong step.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the step shows on previews as on the live app, because loading the key gives it to both.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the assistant gets no way to give the project from chat, because Access has no chat action for people today and adding one is a separate change.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do with the finished plan → chose build and publish.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the tick's detail lives on the assistant-connection wiki page and the Access page only links it, because the Access page sits at its 3,000-word cap; six of its existing sentences were shortened to fit one new line.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: built, walked on the preview with verdict SUCCESS, merged with 36.0.1 and numbered 36.1.0. The step under the tick was not shown on the preview, which holds the key; unit tests cover it.</li>
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
