<!-- openspec-archive v1 2026-10-14-one-connect-message -->
<!-- file proposal.md utf8 7755 -->
# One connect message for every assistant

**Status:** ready-to-ship
**Branch:** auto-fetch-connect-github
**Open questions:** none

## Why

Connecting an assistant takes a long message that comes in two versions and carries a web address and a 64-character fingerprint. Setup then puts the project in a fixed folder in your home. The owner made this simpler in his own app and wants WongStack to work the same way.

## What Changes

1. **One short message, the same for everyone.** The popup no longer picks between a project message and an apps-only one. Setup itself works out what you are allowed and does that. The lines about fingerprints, private folders and never printing credentials are gone.
   ```text
   Set up my company's project for me
   in this folder.
   Download <link> and run it with node.
   Print the sign-in link it shows into
   the chat and wait while I sign in.
   Then tell me what works and what
   is left.
   ```

2. **The assistant downloads the setup file from your own app, at a fixed public link.** The link is your app's address plus a fixed ending, the same for everyone and every time, so the message never changes or goes stale. It needs no sign-in. The file is the setup script WongStack already publishes openly, plus your app's address; it holds no key, and nothing works until the person signs in.
   ```text
     BEFORE                AFTER
   file from a fixed     file from a fixed
   address on GitHub     address on your app
        │                      │
        ▼                      ▼
   assistant checks      assistant runs it
   a fingerprint
        │
        ▼
   assistant runs it
   ```

3. **Setup installs into the folder the chat is in.** It no longer uses a fixed folder in your home.
   ```text
   folder holds       │ what setup does
   ───────────────────┼─────────────────────
   nothing            │ installs the project
   our read-only copy │ updates it
   another copy of it │ signs in, leaves it
   other files        │ stops, changes nothing
   ```
   The downloaded setup file removes itself when it finishes, so no stray file is left in the folder.

4. **No more matching a fingerprint at each release.** WongStack no longer records a fixed address and fingerprint for the setup file, so an app can never show *Ask your employer to finish the reviewed assistant setup*.

**Non-goals:** saving or publishing through the app (planned in its own workspace, *Save through the app*); a sign-in with no tap at all; a sign-in page that opens by itself (the printed link is enough); changing who may install the project; removing Cloudflare's sign-in tool from setup; any change to an install's sign-in wall.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: one setup message for everyone, the setup file served by the app at a fixed public link, and setup that installs into the folder it runs in.

## Impact

- `app/worker/employee-access/prompt.ts`, `setup.ts`, a new setup-file module and its route in `app/worker/index.ts`; `bootstrap-release.json` removed.
- `app/src/components/AssistantSetup.tsx` and `app/src/lib/access.ts`.
- `scripts/employee-bootstrap.mjs` and its tests.
- `wiki/stack/employee-project.md`, `wiki/stack/mini-apps.md`, `wiki/stack/cloudflare-access.md`.
- `CHANGELOG.md` (minor), `scripts/retired-names.json`, the payload file lists.

## Decision log

- **2026-10-13** — Asked how Connect should get simpler → chose the shape of his ClaymooApp plan `one-connect-message`, by pointing to it twice.
- **2026-10-13** — Asked how the two parts should run → chose simpler Connect here and saving through the app in a new workspace.
- **2026-10-13** — Asked what a teammate may do through the app without GitHub → chose save only; planned in the other workspace, not here.
- **2026-10-13** — Assumed: the setup file is served under the opening every install's sign-in wall already has for memory, because the publish check matches the wall exactly, so a new opening would stop every existing install publishing until its owner reran a Cloudflare step.
- **2026-10-13** — Assumed: a preview's link needs a sign-in, because only the live app has that opening; the check before publishing fetches it with the checker's own sign-in.
- **2026-10-13** — Assumed: a person who lacks the tick to install the project still gets no message and a greyed card, because who may connect is not part of this change.
- **2026-10-13** — Assumed: the "install Node, cloudflared or Git if missing" line leaves the message, because setup already names the missing tool, where to get it, and to run again.
- **2026-10-13** — Assumed: setup keeps Cloudflare's sign-in tool, because the ClaymooApp plan keeps it and replacing it means the app issuing its own device sign-ins.
- **2026-10-13** — Assumed: a message copied before this ships keeps working, because the fixed public address it names stays reachable.
- **2026-10-13** — Asked, in a review note, to keep a fixed public link → chose a fixed link on the app in place of the ten-minute one; the links table and the ten-minute line are dropped.
- **2026-10-13** — Assumed: "a fixed public link" means one on the person's own app, not today's GitHub address, because the GitHub address needs the fingerprint that makes the message long.
- **2026-10-13** — Asked, in a review note, whether the sign-in page should open by itself → chose printing the link only; the change is dropped.
- **2026-10-13** — Asked what next, with the notes applied → chose build and publish.
- **2026-10-13** — Assumed: a person with no project keeps a private copy of the setup script to call their apps with, because the downloaded file removes itself and they would otherwise download again for every call.
- **2026-10-13** — Assumed: "another copy of the project" is a Git folder that holds the setup script and did not come from the app, because the recorded app address can differ from the one people use.
- **2026-10-13** — Assumed: the no-sign-in fetch from the live app is checked right after publishing, not as a task, because only the live app has the opening and a plan can not be archived with a task that waits on its own publish.
- **2026-10-13** — Saved: the build is written and its local checks pass; the two preview checks (tasks 5.2, 5.3) and the live no-sign-in fetch are still to run.
- **2026-10-14** — Checked on the preview with the owner's own sign-in: the fixed link served the setup file carrying the preview's address; run with nothing typed in an empty folder it installed the project there and removed itself; a second run said up to date. The message was read from the route the popup reads, not from the screen.
- **2026-10-14** — Assumed: signing in waits ten minutes, up from two, because the first real try timed out before the owner could tap the link. Said to the owner before publishing; not objected to.
- **2026-10-14** — Archived for publishing: every task is ticked; the no-sign-in fetch from the live app is checked right after it goes live.
- **2026-10-14** — Archive checkpoint: the check before publishing passed on the preview and kept two checks for later publishes, *The steps can't load* and the setup file at its fixed link; the popup's message stays a check by a signed-in person, because the checker's machine sign-in is refused it by design.
- **2026-10-14** — Archive checkpoint: the main project gained *Teammates save changes through the app* while this waited, so it was brought in and both kept. This change takes the next number, and the header now names the branch it was built on.

<!-- end proposal.md -->
<!-- file design.md utf8 5993 -->
# Design

## Context

See proposal.md. Today `GET /api/access/setup` (`app/worker/employee-access/setup.ts`) answers one of two prompts from `prompt.ts`, both naming `scripts/employee-bootstrap.mjs` at a pinned public Source commit with a SHA-256 from `bootstrap-release.json`. Blank pins make the prompt `unavailable`.

One Worker serves everything behind Cloudflare Access. `app/worker/index.ts` answers `/_memory/*` before the identity check, and the Access app carries a `public` override for `/_memory/*` on the production Worker and its anchor only. `scripts/check-private-access.mjs` deep-equals the app's destinations before every publish, so any other override fails the gate until the owner reruns `provision.mjs access`.

`scripts/employee-bootstrap.mjs` is one standalone file. `install` signs in through `cloudflared`, clones through `/api/access/code/git/` into `--dir`, else the folder used last time, else `~/<host>`.

The shape follows ClaymooApp's `one-connect-message` change, adapted to one Worker and, by review note, to a fixed link.

## Goals / Non-Goals

**Goals:**
- An assistant with no sign-in fetches the setup file from a fixed link in the message.
- No Access policy change on any install, no new secret, no new table.

**Non-Goals:**
- Any change to who may connect or install the project, or to the read-only code route.
- Replacing `cloudflared`, or opening the sign-in page for the person.

## Decisions

**D1. A fixed public link under the existing memory opening.**
- `GET /_memory/setup.mjs`, matched in `index.ts` before the `MEMORY_PREFIX` hand-off and before the identity check. It answers the setup file, `text/javascript; charset=utf-8`, `no-store`. Any other method is 405.
- It reads no database and carries no memory credential.
- Why not a ten-minute token link (the first draft): the owner asked for a fixed link; it also needs a table, a mint step and a message that goes stale. The file is the script the public Source repo already serves, so a token protected nothing secret.
- Why not a new `/_setup/*` override: `check-private-access.mjs` matches destinations exactly, so every existing install's publish would fail until its owner reran the Access step with a Cloudflare token.
- Why not keep the pinned GitHub URL: the fingerprint is what makes the message long, and the pin ceremony is a release step that can leave Connect unavailable.
- Staging has no override, so a preview's link answers Cloudflare's sign-in to an anonymous fetch. `/verify` fetches it with the service token.
- An install that is [open until the card](../../../wiki/stack/cloudflare-access.md#open-until-the-card) has no wall; the route works as written.

**D2. The served file.** The Worker imports `scripts/employee-bootstrap.mjs` as text (`?raw`) in a module of its own, `setup-file.ts`, that only `index.ts`'s route reaches, so a test that loads the handlers never loads it. The body is the script with its `const SERVED_FROM = '';` line replaced by the request's origin, by one pure tested function that throws when the marker is absent.

**D3. The message.** `setupMessage(origin)` in `prompt.ts` returns the proposal's lines with `<origin>/_memory/setup.mjs`. The `artifact` and `project` parameters, the pinned URL and `bootstrap-release.json` go. `GET /api/access/setup` keeps its shape; `prompt.state: 'unavailable'` remains only for `lacked`.

**D4. The popup.** `AssistantSetup` keeps its three steps and closing lines; only the message text changes. The handling of an unready install goes with the pins.

**D5. Setup installs into the current folder** (`scripts/employee-bootstrap.mjs`).
- No command means `install`. Origin: `--origin`, else `SERVED_FROM`, else the origin saved for the copy the script sits in.
- Folder: `--dir`, else the copy the script sits in when run as `scripts/employee-bootstrap.mjs` inside one, else `process.cwd()`. The `~/<host>` default and the remembered `project.json` folder go.
- After sign-in, look at the folder before asking for the download. A Git copy whose `origin` is another address for the same project is left as it is: the report says signed in, copy left alone, and never prints the *not included* line.
- The served file's own path does not count as "other files". It removes itself before a clone, since Git refuses a non-empty folder, and again when `main` ends, pass or fail. A copy inside the project never deletes itself.
- State stays in `~/.local/state/wong-company/<hash of origin>`. `login`, `status`, `code`, `list`, `describe`, `call` keep working. The sign-in link is printed as today.

**D6. Retire the pins.** Remove `bootstrap-release.json`, its distribution tests and the two wiki sections that own it; add the file name to `scripts/retired-names.json` and drop it from the payload lists and the journey file's watched paths.

## Risks / Trade-offs

- [Anyone can fetch the setup file from a live app] → it is the script the public Source repo already serves, plus the address they fetched it from. It holds no key; every call it makes needs the person's own sign-in.
- [No fingerprint: the assistant runs what the app's address serves] → that address is the one the person signs in to and trusts with their work; an attacker who controls it already controls the app.
- [A path under `/_memory/` now serves something that is not memory] → one route, named and commented at the match, documented in `cloudflare-access.md`; it shares nothing with the memory handler.
- [A person cannot connect an assistant to a preview without a signed-in fetch] → previews are for checking; the live app is where people connect.
- [`?raw` of a file outside `app/`] → proven at build in task 1; if Vite refuses the path, copy the script into the Worker at build with the existing prebuild hook.

## Migration Plan

No data change. An install gets the route with its next update; a message copied earlier keeps working, because the pinned public address stays reachable. Rollback: revert the code.

<!-- end design.md -->
<!-- file tasks.md utf8 3394 -->
# Tasks

## 1. The served file and the message (Worker)

- [x] 1.1 Add `setup-file.ts` in `app/worker/employee-access/`, importing `scripts/employee-bootstrap.mjs` as text, and the pure function that sets `SERVED_FROM`; test that it carries the origin and throws without the marker. Verify `npm run build` in `app/` bundles the script; if Vite refuses the path, use the prebuild hook as design D2's risk says.
- [x] 1.2 Serve `GET /_memory/setup.mjs` in `app/worker/index.ts` before the memory hand-off and the identity check; test that it answers the file with `no-store` and no sign-in, that another method is refused, and that other `/_memory/` calls still reach the memory handler.
- [x] 1.3 Rewrite `prompt.ts` to `setupMessage(origin)` and simplify `setup.ts`; update `prompt.test.ts` and the setup tests: one message for `ready` and `off`, no message for `lacked`, a service token or a removed person.
- [x] 1.4 Remove `bootstrap-release.json` and every reader of it; verify `npm test` in `app/` passes at full coverage.

## 2. The popup

- [x] 2.1 Drop the handling of an unready install from `AssistantSetup` and `setupSchema`; update `AssistantSetup.test.tsx` and `CopyText.test.tsx` and verify they pass.

## 3. The setup script

- [x] 3.1 In `scripts/employee-bootstrap.mjs`, add the `SERVED_FROM` line, make no command mean `install`, and resolve the origin and folder by design D5; remove the home-folder default and the remembered folder. Test each row of the proposal's folder table.
- [x] 3.2 Make a served file ignore its own path, remove itself before a clone and when `main` ends, and never remove a copy inside the project; test all three.
- [x] 3.3 Update `scripts/tests/employee-bootstrap.test.mjs`, `employee-project.test.mjs`, `company-api-payload.test.mjs` and `cli-conventions.test.mjs` for the removed pins and the new defaults; verify `node --test scripts/tests/` passes.

## 4. Docs and release

- [x] 4.1 Rewrite `wiki/stack/employee-project.md`: the message, the fixed link, the folder table; delete *Get the reviewed bootstrap* and *Publish checked artifact pins*, fixing every link to them (`memory.mjs areas wiki/stack/employee-project.md` lists them).
- [x] 4.2 Add the setup link to the public surface in `wiki/stack/cloudflare-access.md`, and update the popup's description in `wiki/stack/mini-apps.md`.
- [x] 4.3 Add `bootstrap-release.json` to `scripts/retired-names.json`, drop it from `payload-files.json`, the payload manifest and the journey file's watched paths, and add the new Worker file where those lists need it; verify `node scripts/check-retired-names.mjs` and `node scripts/check-payload-links.mjs` pass.
- [x] 4.4 Add `## Next (minor) — One connect message for every assistant` to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand; a message copied earlier keeps working.

## 5. Verify

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate one-connect-message --strict --no-interactive`; both pass.
- [x] 5.2 `/save`, then on the preview: open Connect your assistant and see the short message; fetch its link with the checker's sign-in and get the setup file carrying the preview's address.
- [x] 5.3 On the preview, run the fetched file in an empty folder as the checker and confirm the project lands in that folder and the file is gone; run it again and confirm *up to date*.

<!-- end tasks.md -->
<!-- file specs/employee-onboarding/spec.md utf8 5640 -->
## MODIFIED Requirements

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a setup file the business app itself serves. Setup SHALL work in the folder the assistant runs it in unless another is named: it SHALL install the project only into an empty or new folder, SHALL update the read-only copy it finds there, SHALL leave any other copy of the project as it is, and SHALL stop without changing a folder that holds other files. An employee without Project code, where the apps-only connection still applies, SHALL obtain a usable company API client without the project. Setup SHALL NOT hand a device a repository credential, register a repository integration or change the device's own repository authentication. Setup SHALL preserve dirty work, conflicting local folders and unpushed commits, and an update SHALL never discard a person's local changes; interrupted setup SHALL resume against the same target. A downloaded setup file SHALL remove itself when it finishes. API readiness SHALL require actual authorized connection evidence, and the project SHALL be reported installed only after it is on the device.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps, on an app that can not hand its project out, pastes the setup message into their assistant
- **THEN** the assistant can run setup and call their approved company actions without needing access to the private project source

#### Scenario: Setup runs in an empty folder

- **WHEN** a person who holds Project code has their assistant run the setup file in an empty folder
- **THEN** the project is installed in that folder, and the setup file is no longer there

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

#### Scenario: The folder holds another copy of the project

- **WHEN** setup runs in a copy of the project that came from where the project is kept, not from the app
- **THEN** the person is signed in, the copy is left as it is, and nothing says the project is not included for them

#### Scenario: An update meets local changes

- **WHEN** a person who changed files in their copy runs the update
- **THEN** their changes are kept, and they are told when the update could not be applied on top of them

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in

## ADDED Requirements

### Requirement: One setup message serves everyone who may connect

The app SHALL give every person who may connect the same short setup message, whether or not they hold Project code. The message SHALL name one download link, tell the assistant to print the sign-in link into the chat and wait, and ask for a report of what works. It SHALL carry no key, no fingerprint to check and no instruction about where to store files. What a person receives SHALL be decided by setup against their access at that moment, never by the wording of the message.

#### Scenario: Two people with different access copy the message

- **WHEN** a person who holds Project code and a person on an apps-only connection each open Connect your assistant
- **THEN** they see the same message

#### Scenario: A person without Project code runs a message meant for anyone

- **WHEN** a person who lacks Project code runs the setup file from a message someone else copied
- **THEN** setup refuses the project for them and says to ask their admin

### Requirement: The app serves the setup file at a fixed public link

The live app SHALL serve the setup file at one fixed address under its own, the same for every person and every time, with no sign-in. The served file SHALL carry the address of the app that served it and SHALL carry no key, session or other secret; everything it does for a person SHALL still need that person's own sign-in. The link SHALL need no change to an installation's sign-in rules.

#### Scenario: An assistant fetches the file with no sign-in

- **WHEN** an assistant fetches the link from the live app with no sign-in
- **THEN** it receives the setup file, which sets up against that app with no address typed

#### Scenario: Someone with no account runs the file

- **WHEN** a person who can not sign in to the app runs the setup file
- **THEN** setup stops at sign-in, and nothing of the project or the apps reaches them

<!-- end specs/employee-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-13

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 54215 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-14-one-connect-message</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-14-one-connect-message">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-14-one-connect-message</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Connecting an assistant takes a long message that comes in two versions and carries a web address and a 64-character fingerprint. Setup then puts the project in a fixed folder in your home. The owner made this simpler in his own app and wants WongStack to work the same way.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One short message, the same for everyone.</b> The popup no longer picks between a project message and an apps-only one. Setup itself works out what you are allowed and does that. The lines about fingerprints, private folders and never printing credentials are gone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Set up my company's project for me</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">in this folder.</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">Download &lt;link&gt; and run it with node.</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Print the sign-in link it shows into</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">the chat and wait while I sign in.</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">Then tell me what works and what</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">is left.</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The assistant downloads the setup file from your own app, at a fixed public link.</b> The link is your app's address plus a fixed ending, the same for everyone and every time, so the message never changes or goes stale. It needs no sign-in. The file is the setup script WongStack already publishes openly, plus your app's address; it holds no key, and nothing works until the person signs in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">file from a fixed     file from a fixed</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">address on GitHub     address on your app</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">     │                      │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">     ▼                      ▼</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">assistant checks      assistant runs it</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">a fingerprint</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">     │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">     ▼</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">assistant runs it</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Setup installs into the folder the chat is in.</b> It no longer uses a fixed folder in your home. The downloaded setup file removes itself when it finishes, so no stray file is left in the folder.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">folder holds       │ what setup does</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">───────────────────┼─────────────────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">nothing            │ installs the project</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">our read-only copy │ updates it</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">another copy of it │ signs in, leaves it</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">other files        │ stops, changes nothing</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>No more matching a fingerprint at each release.</b> WongStack no longer records a fixed address and fingerprint for the setup file, so an app can never show <i>Ask your employer to finish the reviewed assistant setup</i>.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> saving or publishing through the app (planned in its own workspace, <i>Save through the app</i>); a sign-in with no tap at all; a sign-in page that opens by itself (the printed link is enough); changing who may install the project; removing Cloudflare's sign-in tool from setup; any change to an install's sign-in wall.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked how Connect should get simpler → chose the shape of his ClaymooApp plan <code>one-connect-message</code>, by pointing to it twice.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked how the two parts should run → chose simpler Connect here and saving through the app in a new workspace.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked what a teammate may do through the app without GitHub → chose save only; planned in the other workspace, not here.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the setup file is served under the opening every install's sign-in wall already has for memory, because the publish check matches the wall exactly, so a new opening would stop every existing install publishing until its owner reran a Cloudflare step.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a preview's link needs a sign-in, because only the live app has that opening; the check before publishing fetches it with the checker's own sign-in.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a person who lacks the tick to install the project still gets no message and a greyed card, because who may connect is not part of this change.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the &quot;install Node, cloudflared or Git if missing&quot; line leaves the message, because setup already names the missing tool, where to get it, and to run again.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: setup keeps Cloudflare's sign-in tool, because the ClaymooApp plan keeps it and replacing it means the app issuing its own device sign-ins.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a message copied before this ships keeps working, because the fixed public address it names stays reachable.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked, in a review note, to keep a fixed public link → chose a fixed link on the app in place of the ten-minute one; the links table and the ten-minute line are dropped.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: &quot;a fixed public link&quot; means one on the person's own app, not today's GitHub address, because the GitHub address needs the fingerprint that makes the message long.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked, in a review note, whether the sign-in page should open by itself → chose printing the link only; the change is dropped.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked what next, with the notes applied → chose build and publish.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a person with no project keeps a private copy of the setup script to call their apps with, because the downloaded file removes itself and they would otherwise download again for every call.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: &quot;another copy of the project&quot; is a Git folder that holds the setup script and did not come from the app, because the recorded app address can differ from the one people use.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the no-sign-in fetch from the live app is checked right after publishing, not as a task, because only the live app has the opening and a plan can not be archived with a task that waits on its own publish.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Saved: the build is written and its local checks pass; the two preview checks (tasks 5.2, 5.3) and the live no-sign-in fetch are still to run.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Checked on the preview with the owner's own sign-in: the fixed link served the setup file carrying the preview's address; run with nothing typed in an empty folder it installed the project there and removed itself; a second run said up to date. The message was read from the route the popup reads, not from the screen.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: signing in waits ten minutes, up from two, because the first real try timed out before the owner could tap the link. Said to the owner before publishing; not objected to.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Archived for publishing: every task is ticked; the no-sign-in fetch from the live app is checked right after it goes live.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Archive checkpoint: the check before publishing passed on the preview and kept two checks for later publishes, <i>The steps can't load</i> and the setup file at its fixed link; the popup's message stays a check by a signed-in person, because the checker's machine sign-in is refused it by design.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Archive checkpoint: the main project gained <i>Teammates save changes through the app</i> while this waited, so it was brought in and both kept. This change takes the next number, and the header now names the branch it was built on.</li>
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
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
