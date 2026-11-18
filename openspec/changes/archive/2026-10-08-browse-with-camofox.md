<!-- openspec-archive v1 2026-10-08-browse-with-camofox -->
<!-- file proposal.md utf8 12705 -->
# Browse your accounts with camofox

**Status:** ready-to-ship
**Branch:** camofox-browser-setup
**Open questions:** none

## Why

Some sites turn the assistant's browser away, and the fallback to Cloudflare's browser adds a second browser, a login to copy across, and a rule page, yet still fails on sites like DoorDash. Camofox is one browser that more sites let in: in a trial on 2026-10-07 it opened Uber Eats 10 times out of 10 where today's browser was stopped, ran 530 steps without a crash, and kept a real Amazon login across a restart.

## What Changes

- **BREAKING: your errands run in camofox, a browser more sites let in.** Booking, ordering, and anything else the assistant does on your accounts moves to it. Checking a preview of your own app stays on today's browser.
  ```text
              │ today's   │ camofox
              │ browser   │
  ────────────┼───────────┼──────────
  Uber Eats   │ blocked   │ loads
  Amazon      │ loads     │ loads
  DoorDash    │ blocked   │ blocked
  your errands│ before    │ +now
  preview     │ stays     │ no
  checks      │           │
  ```
- **BREAKING: Cloudflare's browser is gone.** A blocked site no longer moves to a second browser, so no login is copied between two browsers and *use the cloud browser first* stops working. A site that still refuses, like DoorDash, ends as today: the assistant stops and gives you numbered steps to finish on your own device.
  ```text
    BEFORE                   AFTER
  own browser              camofox
      │ blocked               │ blocked
      ▼                       ▼
  Cloudflare's browser     steps for you
      │ blocked
      ▼
  steps for you
  ```
- **The no-disguise rule is removed.** The guides no longer say the assistant never changes how its browser looks to a site. Camofox presents itself as an ordinary browser; that is why more sites load.
- **Still yours: puzzles, passkeys, and device checks.** The assistant does not solve a *prove you are human* puzzle, and cannot give a fingerprint or approve on your phone. It stops and gives you the steps, as today.
- **BREAKING: saved passwords move to a plain file on your computer.** The password link looks and works as today. What you save now goes into one file in your home folder that only your user can read, not into today's locked store. A small program reads the file and types the login into the site; the assistant still never sees a password, and learns only *logged in* or *not accepted*.
  ```text
  you            form        program      site
   │─ login ─────▶│
   │              │─ save ─▶ file
   │                           │
   │              assistant ──▶│ "log in"
   │                           │── types ──▶│
   │              assistant ◀──│ logged in
  ```
- **This can't be undone for logins you have today: you save them again.** Passwords in today's locked store and sites you are signed in to in today's browser do not carry over. The first time an errand meets each site, the assistant sends the password link. Nothing is deleted from the old store.
- **Card details still go through the private form, and are never kept.** The form looks the same. Its button types your card straight into the site and presses the site's button once; nothing is written to a file, and the assistant sees only how it ended.
- **The first errand asks before a large download.** Camofox needs about 1.4 GB of disk and about 700 MB of memory while it runs. The assistant asks once, installs it into your home folder, and later errands start at once.
- **Two errands can run at once.** Today a second chat or a scheduled run finds the browser busy and waits. In camofox each gets its own pages and shares your logins.
- **New installs stop giving your Cloudflare key the cloud browser's permission.** A key that already has it keeps it; nothing uses it.
- **Nothing is reported to camofox's makers.** Camofox sends anonymous failure reports by default; the assistant turns that off every time it starts it.
- **What stays the same.** The password link, the private form, and the key link look and close as today. Codes still come through the chat or your email. The assistant still shows a picture at each key moment and asks before it publishes, sends, books, pays, or deletes.

Non-goals: a live view of the browser (a later change); solving puzzles; hiring a network address to get past DoorDash; moving preview checks to camofox; encrypting the passwords file; carrying old saved logins over; the unpublished practice-errands work (pull request #233).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the purpose names camofox; logins persist in the personal browser's saved state instead of a Chrome profile; passwords live in a private local file a script reads; tasks share the browser instead of taking turns; the profile, one-at-a-time, tool-guide, cloud-browser, login-carry, no-disguise, first-browser, and cloud-session requirements are removed; a refused site ends with steps for the person; the browser reports nothing to its makers; an update leaves earlier logins untouched.
- `dependencies`: camofox joins the tools a machine may need, installed on first use with a pinned browser driver.
- `cloudflare-provisioning`: the token widen no longer grants the cloud browser's permission; a token that has it keeps it.

## Impact

- New `.agents/skills/browser/scripts/browse.mjs`: installs, starts, and drives camofox (`open`, `snapshot`, `click`, `type`, `press`, `select`, `screenshot`, `get url|count|value`, `login`, `logins`, `forget`, `save`, `close`, `status`); new `scripts/tests/browse.test.mjs` with a fake camofox server.
- `.agents/skills/browser/scripts/cloud-browser.mjs` and `scripts/tests/cloud-browser.test.mjs`: deleted. `.agents/skills/browser/SKILL.md` rewritten for `browse.mjs`.
- `.agents/skills/hand-over/scripts/hand-over.mjs`, `form.mjs`, `passwords.mjs` and their tests: the browser calls go through `browse.mjs`'s client; the live-feed typing goes; passwords save to `~/.wong-stack/logins.json`.
- `wiki/development/browsing.md`, `passwords.md`, `login-codes.md`, `required-tools.md`, `README.md`; `blocked-sites.md` deleted; `.agents/skills/wong-setup/references/tools.md`; `.agents/skills/memory/references/areas.json`; `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest; `scripts/retired-names.json`; `scripts/tests/fixtures/browser-pages.json`; `scripts/tests/cli-conventions.test.mjs`.
- `.agents/skills/update-dependencies/scripts/update.mjs`: knows camofox's pinned versions.
- `.agents/skills/wong-setup/scripts/provision.mjs`, `references/permission-groups.md`, `scripts/tests/fixtures/cloudflare.mjs`: the `Browser Run Write` group leaves the widen.
- New dependency on a machine, not in the repo: `@askjo/camofox-browser` 1.18.1 with `playwright-core` pinned to 1.58.x, in `~/.wong-stack/camofox/`. `agent-browser` stays for `/verify`.
- Unpublished pull request #233 (practice errands) edits the same scripts and spec; it must be reworked onto this before it publishes.
- `CHANGELOG.md` *Next (major)* entry.

## Decision log

- **2026-10-07** — Asked to look up camofox and try it in place of agent-browser → trialled it: it runs, and it disguises the browser, which the guides forbade.
- **2026-10-07** — Asked about the no-disguise rule → answered: *let's remove the rule from our docs it's a waste of space*.
- **2026-10-07** — Asked about saved passwords → answered: *just keep it in a local file for now saved somewhere*.
- **2026-10-07** — Asked about Cloudflare's browser → answered: *no need for cloudflare browser*.
- **2026-10-07** — Asked whether camofox crashes or is unreliable → ran 530 steps over 16 minutes with no crash; two faults found and worked around (the browser driver pin, and a retry for the first click after a start).
- **2026-10-07** — Asked whether logins should be headless, with the form saving to a file the assistant reads → chose headless with the form and a file, with one change he accepted: a script reads the file and types, not the assistant.
- **2026-10-07** — Asked whether a plain passwords file is acceptable → answered: *that's fine if someone can get into the machine like it's already an L*.
- **2026-10-07** — Asked how this fits with the unpublished practice-errands change (pull request #233) → chose keep going here.
- **2026-10-07** — Asked whether the live view belongs in this change → first answered *can you solve those*; told the assistant does not solve puzzles and cannot do passkeys or device checks. Asked again → chose later, as its own change.
- **2026-10-07** — Asked whether this change also removes agent-browser → told `/verify` still needs it; he first asked to move `/verify` too, *rather have fewer dependencies then carry two*, then withdrew: *actually nevermind you're right*. Preview checks stay on agent-browser. Found while checking: camofox has no way to send the extra request headers `/verify` uses to pass a preview's login wall.
- **2026-10-07** — Assumed: card details go from the form straight into the site and are never written to a file, because a card on disk outlives its one use; said in the chat, not objected to.
- **2026-10-07** — Assumed: the assistant asks once before the 1.4 GB install and puts it in the home folder, because a download that size should not start unasked and a home-folder install needs no admin password.
- **2026-10-07** — Assumed: old saved logins are left where they are and not copied, because today's store gives out no password to copy and deleting it could not be undone.
- **2026-10-07** — Assumed: two errands may run at once, because the one-at-a-time rule came from Chrome's profile lock and camofox keeps each task's pages apart; the trial ran two chats at once.
- **2026-10-07** — Assumed: new installs stop granting the cloud browser's Cloudflare permission and existing keys keep it, because a key should not hold a permission nothing uses and narrowing a live key is a separate, riskier step.
- **2026-10-07** — Assumed: camofox's failure reporting is switched off, because it names the sites a person visits to a third party, even hashed.
- **2026-10-07** — Assumed: a site camofox can't open ends with steps for the person, with no second browser and no hired network address, because he dropped Cloudflare's browser and the trial showed DoorDash refusing both.
- **2026-10-07** — Assumed: the plan's last task, save and confirm CI, is left to publishing, because `/ship` makes the one checkpoint and its gate is CI; the end-to-end check uses a public practice login, because no real account should be used unasked.
- **2026-10-07** — Check: `scripts/tests/cloud-browser.test.mjs` is deleted with `cloud-browser.mjs`, the only code it tested; every test in it was read first, and none guards a file that stays. `scripts/tests/browse.test.mjs` tests the script that replaces it.
- **2026-10-07** — Building: the tests that faked `agent-browser` in `scripts/tests/hand-over.test.mjs`, `form.test.mjs`, and `passwords.test.mjs` now run against a fake camofox server. The tests of the live feed's key presses and of stopping a blocked password save are gone with that code: a save is now one file write. Every test and check runs once, at the end of the build, not after each task.
- **2026-10-07** — Building: the private form never retries a step and never starts the browser, where the plan's one retry would apply, because a reopened page has lost what was typed, and a second press could pay twice. `login` follows the same rule.
- **2026-10-07** — Building: camofox's server keeps no log file, because camofox logs a failed typing step's detail, which can quote a password or a card number.
- **2026-10-07** — Building: `login` prints a fourth result, `typed`, for a step with no password box (an email, then *Continue*), because such a page often keeps its address and would read as *rejected*.
- **2026-10-08** — Assumed: the end-to-end check's *still logged in after a restart* step is shown by a cookie that survived a hard kill and a restart, because the public practice login site keeps no session to check; a real Amazon login survived a restart in the trial.
- **2026-10-08** — Archive checkpoint: built, tried on a real camofox (saving through a hard kill, a practice login, two sessions at once, a framed card box, no report sent), main merged in with five files resolved by hand, numbered 38.0.0.

<!-- end proposal.md -->
<!-- file design.md utf8 10643 -->
# Design

## Context

See proposal.md for why. Today personal browsing is `agent-browser` on a shared Chrome profile, with `cloud-browser.mjs` moving a blocked site to Cloudflare Browser Run. The private links (`hand-over.mjs`) reach the browser only through an injected `browser(args)` function that shells out to `agent-browser`, plus a WebSocket to its live feed for typing a private form's values.

[camofox-browser](https://github.com/jo-inc/camofox-browser) (`@askjo/camofox-browser` 1.18.1, MIT) is a local REST server over Camoufox, a Firefox build. It has no CDP, so `agent-browser` cannot attach: it needs its own client. The trial on 2026-10-07 (`/root/.cache/camofox-trial/`, not in the repo) found:

- 530 steps in 16 minutes, no crash, no tool failure; two users at once worked.
- `playwright-core` resolves to 1.64.0 under camofox's `^1.58.0`, and saving a login then fails whenever an origin with stored data has no open tab (`Network.setRequestInterception`, unknown `bypassServiceWorker`). 1.58.2 saved 4 of 4 and kept a real Amazon login across a restart.
- Logins are one `storage-state.json` per `userId`, written only on session close, shutdown, cookie import, or the VNC plugin's export.
- The first click after a fresh start hung 30 seconds twice; the tab is destroyed and later calls answer 410 `browser_restarted`.
- A page read under a second after `open` can be half-loaded.
- Crash and hang reports go to the makers unless `CAMOFOX_CRASH_REPORT_ENABLED=false`.
- The Camoufox download is about 660 MB and unpacks to 1.3 GB; it failed when the temp folder was a small RAM disk.

## Goals / Non-Goals

**Goals:**

- One script, `browse.mjs`, is the only thing that talks to camofox: the assistant's commands, the private form, and the password link all go through it.
- No password or card value reaches argv, env, a log, or the assistant; the passwords file is the one place a password rests.
- `/verify` and `agent-browser` are untouched.

**Non-Goals:**

- A live view (camofox's VNC plugin). The trial page with a paste bar is recorded under Open Questions.
- Proxies, check solving, or any second browser.
- Encrypting the passwords file, or importing agent-browser's vault.

## Decisions

### One client script, `browse.mjs`, in the `browser` skill

`.agents/skills/browser/scripts/browse.mjs` is a CLI and an importable module. It replaces `cloud-browser.mjs` as the skill's script.

```
browse.mjs open <url>            # prints BROWSE_URL=, waits for the page to settle
browse.mjs snapshot              # the page as text with refs (e1, e2…)
browse.mjs click|type|press|select <ref-or-selector> [text]
browse.mjs get url|count <selector>|value <ref-or-selector>
browse.mjs screenshot [--if-changed]   # prints a temp path, or none
browse.mjs logins                # names, sites, usernames; never a password
browse.mjs login <name> --username <ref> --password <ref> [--submit <ref>]
browse.mjs forget <name>
browse.mjs save                  # checkpoint the logins now
browse.mjs close                 # this task's tab; saves
browse.mjs status | install | stop
```

A task's tab is keyed by `--session <name>` (default: the workspace folder name), which becomes camofox's `sessionKey`; the `userId` is always `me`. The tab id sits in `~/.wong-stack/camofox/tabs/<session>.json`.

*Why not raw `curl` from the assistant:* the pin, the reporting switch, the settle wait, the first-click retry, and the login typing are all things an assistant would get wrong differently each time; a script does them the same way every time. *Why not the fork with its own CLI and vault (`redf0x1/camofox-browser`):* 410 stars against 11.5k, marked preview, and untried.

### Install and start

`install` runs `npm install --prefix ~/.wong-stack/camofox @askjo/camofox-browser@1.18.1 playwright-core@1.58.2` with `TMPDIR` set to `~/.wong-stack/camofox/tmp`, so the 660 MB download never lands on a RAM disk. Any command that finds no install prints `BROWSE_NEEDS=install` with the sizes and exits 3; the assistant asks, runs `install`, and retries. The versions live in one constant that `update-dependencies` reads and tests.

The server starts on demand, detached, bound to `127.0.0.1` on a port recorded in `~/.wong-stack/camofox/server.json`, with `CAMOFOX_CRASH_REPORT_ENABLED=false`, `CAMOFOX_PROFILE_DIR=~/.wong-stack/camofox/profiles`, and a `CAMOFOX_API_KEY` generated once into a 0600 file. It stops itself through camofox's own idle timeout. `start` refuses to run if the installed `playwright-core` is not 1.58.x.

### Reliability wrappers

- `open` waits until two snapshots a second apart match, up to 8 seconds.
- A command answered 410 `browser_restarted`, or a click that times out, reopens the tab at its last URL and retries once; a second failure is reported.
- Every command has a deadline and prints one `BROWSE_ERROR=<reason>` line on failure.

### Saving logins without closing

`save` asks camofox to checkpoint by posting an empty cookie list to `/sessions/me/cookies` with the API key, which fires the persistence plugin's checkpoint and leaves every tab open. `login` runs `save` as soon as the page leaves the login address, so a crash after that loses nothing. `close` removes only this task's tab, and closes the session (which also saves) when no tab is left.

*Proven 2026-10-08 on a real camofox 1.18.1 with driver 1.58.2:* a cookie was set, `save` ran with the tab open, the server and browser were killed with `kill -9`, and the cookie was back after the restart. The empty import checkpoints; no fallback was needed.

### Passwords in a file

`~/.wong-stack/logins.json`, mode 0600 in a 0700 folder: `[{name, url, username, password}]`. `passwords.mjs` keeps its routes, limits, and naming (`chooseName`), and swaps its two `agent-browser auth` calls for reads and an atomic write of this file. `browse.mjs logins` prints name, host, and username. `browse.mjs login <name>` reads the entry in-process and posts each value to camofox's `/type` for the ref the assistant named, over loopback; it prints only `BROWSE_LOGIN=accepted|rejected|missing`. Accepted means the address left the login page within 15 seconds.

The assistant names the boxes from its own snapshot, as it already does for a private form, so two-step logins (email, *Continue*, password) are two `login` calls, each with the one box that page shows. *Why not auto-detect the boxes:* sites vary too much, and the assistant already reads the page.

The spec's rule that the assistant never reads a password is kept by instruction, not by a lock: the file is readable by the same user the assistant runs as. That is the trade the person accepted.

### The private form types through camofox

`form.mjs` loses `openFeed`, `typeText`, and `keyEvents`. `fillField` calls the injected browser client: `type` with the value for a text box (camofox clears and types server-side), `select` for a dropdown after reading its value. The value travels in a loopback HTTP body, never argv. `hand-over.mjs`'s `browser(args)` becomes a call into `browse.mjs`'s module with the session of the chat that opened the form; `streamPort` and `formFeed` go. `seen()` reads `get url` and `get count` through the same client. The undo on *not accepted* stays: empty each typed box, put each dropdown back.

Form targets change from `@e12` to camofox's `e12`; `isTarget` accepts both spellings so an assistant's habit does not fail the file.

### What goes

`cloud-browser.mjs`, its test, `wiki/development/blocked-sites.md`, the *cloud first* setting, the `Browser Run Write` row in `provision.mjs`'s widen list and `permission-groups.md`. `scripts/retired-names.json` gains `cloud-browser.mjs`, `blocked-sites.md`, `CLOUD_BROWSER_`, and `agent-browser auth`, each pointing at its replacement. `.agents/skills/agent-browser/` stays: `/verify` uses it.

### Docs

`browsing.md` is rewritten around `browse.mjs`: saved logins, pictures, when a step needs you, and a short *when a site refuses the browser* section that takes over from the deleted page. It gains two lines of repeatable knowledge from the trial: read a page only after it settles, and what the install needs. `passwords.md` says where the file is and what it trades. `login-codes.md` swaps its commands. `required-tools.md` and `wong-setup/references/tools.md` gain camofox as an on-first-use tool; setup does not offer it up front, because most installs never browse.

## Risks / Trade-offs

- [A plain passwords file] → 0600 in a 0700 folder outside every repo; said plainly in `passwords.md`; encryption is a later change.
- [The assistant could read the file] → the guide forbids it as it forbids `~/.agent-browser/auth/` today; `browse.mjs` never prints a password, and a test greps its output for the stored values.
- [Camofox ships a newer driver again and breaks saving] → the exact versions are pinned at install and checked at start; `update-dependencies` moves them only with the save test passing.
- [A site treats a disguised browser as abuse and locks the account] → the assistant still stops at any human check and never retries a refusal; the person's own device remains the route.
- [DoorDash and similar still refuse] → said in the proposal; no proxy.
- [Camoufox is a 1.4 GB binary from a third party] → asked for once, installed under the home folder, removable by deleting `~/.wong-stack/camofox/`.
- [Private form typing through `/type` may not reach a payment provider's embedded frame] → tried 2026-10-08 on a pretend checkout whose card box sat in a frame from another origin: the snapshot gave the framed box a ref, the form typed all 16 digits into it, pressed the site's button once, and ended `done`. No fallback was needed.
- [Practice errands (PR #233) rebases badly] → it already needed a rework; named in Impact.

## Migration Plan

A major release. An install's sync plan gets one to-do: *the first errand asks to install the new browser and asks you to save each login again.* Nothing is migrated or deleted: `~/.agent-browser/` and `~/.wong-stack/browser-profile/` stay. Rollback is the previous version; the old vault and profile are still there.

## Open Questions

- None that change this plan. For the follow-up live view the person chose to do later: the trial showed camofox's VNC plugin works through a tunnel with `x11vnc`, `novnc`, and `websockify`, at a screen of 1920x1080; noVNC's clipboard panel did not work for the person, and a one-step paste bar (`/usr/share/novnc/paste.html` on the trial machine) did in the assistant's test. It would reverse 34.0.0's removal of the live browser link, for those steps only.

<!-- end design.md -->
<!-- file tasks.md utf8 6825 -->
# Tasks

## 1. The camofox client (`.agents/skills/browser/`)

- [x] 1.1 Write `scripts/browse.mjs` with `install`, `status`, `stop`, and on-demand start by the design (pinned versions in one constant, `TMPDIR` on disk, loopback bind, reporting off, API key file 0600, refuses a driver that is not 1.58.x); verify `browse.test.mjs` covers `BROWSE_NEEDS=install` (exit 3), the start environment, and the driver refusal against a fake server.
- [x] 1.2 Add `open`, `snapshot`, `click`, `type`, `press`, `select`, `get url|count|value`, `screenshot [--if-changed]`, and `close`, with the settle wait, one retry on 410 or a click timeout, a deadline per command, and one `BROWSE_ERROR=` line; verify the tests cover each command, the retry, and a second failure reported, against the fake server.
- [x] 1.3 Add per-task tabs keyed by `--session` with `userId` `me`; verify a test runs two sessions at once and `close` in one leaves the other's tab open.
- [x] 1.4 Add `logins`, `forget`, and `login <name> --username|--password|--submit` reading `~/.wong-stack/logins.json`; verify the tests cover `accepted`, `rejected`, and `missing`, and that no stored username or password appears in stdout, stderr, argv of any child, or the fake server's request log outside the `/type` body.
- [x] 1.5 Add `save`, and make `login` save once accepted and `close` save when it holds the last tab; verify by test against the fake server.
- [x] 1.6 Prove against a real camofox, by hand on this machine, that `save` checkpoints with every tab open (a cookie set, `save`, the server killed, the cookie back after a restart); on failure switch `save` to the design's fallback and record which in the design's Decision on saving.
- [x] 1.7 Rewrite `SKILL.md` for `browse.mjs`'s commands, keeping `hidden` and `disable-model-invocation`; verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.8 Delete `scripts/cloud-browser.mjs` and `scripts/tests/cloud-browser.test.mjs`, and fix `scripts/tests/cli-conventions.test.mjs` and `scripts/tests/fixtures/browser-pages.json` for what remains; verify the script suite passes.

## 2. Passwords in a file (`.agents/skills/hand-over/`)

- [x] 2.1 Change `passwords.mjs` to read and atomically write `~/.wong-stack/logins.json` (0600, folder 0700) in place of the two `agent-browser auth` calls, keeping its routes, limits, and naming; verify `passwords.test.mjs` covers a first save, a replaced password, a second account, the file's mode, and that a failed write reports the login as failed.
- [x] 2.2 Update the header comments in `passwords.mjs` and `hand-over.mjs` that name the vault; verify `passwords-page.test.mjs` and `hand-over.test.mjs` pass unchanged in behavior.

## 3. The private form through camofox (`.agents/skills/hand-over/`)

- [x] 3.1 In `form.mjs`, remove `openFeed`, `typeText`, and `keyEvents`; make `fillField` type through the injected client and accept `e12` and `@e12` targets; verify `form.test.mjs` covers a typed box, a dropdown, the undo on *not accepted*, and both target spellings.
- [x] 3.2 In `hand-over.mjs`, replace `browser(args)` with `browse.mjs`'s client for the opener's session, remove `streamPort` and `formFeed`, and keep `seen()` on `get url` and `get count`; verify `hand-over.test.mjs` covers `done`, `not-accepted`, and a finish the page already meets.
- [x] 3.3 Verify by test that a sent value appears in no argv, env, log, or file, only in the loopback `/type` body.
- [x] 3.4 Try a private form on a real camofox against the pretend shop page with a card field inside an embedded frame, by hand; on failure add the design's per-key fallback and its test, and write the limit in `browsing.md`.

## 4. Cloudflare key (`.agents/skills/wong-setup/`)

- [x] 4.1 Remove `Browser Run Write` from `scripts/provision.mjs`'s widen list and from `references/permission-groups.md`, and update `scripts/tests/fixtures/cloudflare.mjs`; verify the provisioning tests pass and none expects the group.
- [x] 4.2 Add camofox to `references/tools.md` as installed on first use, never offered by setup; verify the page names the install command `browse.mjs install` and no other.

## 5. Dependencies (`.agents/skills/update-dependencies/`)

- [x] 5.1 Teach `scripts/update.mjs` camofox's two pinned versions, moved only together and only when task 1.6's check is rerun; verify its test covers reading the pin from `browse.mjs`.

## 6. Docs (`wiki/`)

- [x] 6.1 Rewrite `wiki/development/browsing.md` around `browse.mjs`: saved logins, sharing the browser, pictures, when a step needs you, a short *when a site refuses the browser* section, and the two trial lessons (read after the page settles; what the install needs); remove every cloud-browser and no-disguise line; verify the wiki checks pass and the page stays under 3,000 words.
- [x] 6.2 Delete `wiki/development/blocked-sites.md` and fix each link to it that `memory.mjs areas wiki/development/blocked-sites.md` lists, including `wiki/development/README.md`; verify `node scripts/check-payload-links.mjs` passes.
- [x] 6.3 Update `passwords.md` (where the file is, who can read it, that earlier saved logins are not carried), `login-codes.md` (commands), and `required-tools.md` (camofox on first use, its sizes); verify the wiki checks pass.
- [x] 6.4 Update `.agents/skills/memory/references/areas.json`'s `browser` area, `payload-files.json`, and the payload manifest for the removed and added files; verify `memory-areas.test.mjs` and the payload checks pass.
- [x] 6.5 Add `cloud-browser.mjs`, `blocked-sites.md`, `CLOUD_BROWSER_`, and `agent-browser auth` to `scripts/retired-names.json` with replacements, allowing `/verify`'s own files where they still apply; verify `node scripts/check-retired-names.mjs` passes.

## 7. Release

- [x] 7.1 Add the `## Next (major) — Browse your accounts with camofox` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: the first errand asks to install the new browser, and each login is saved again; verify `node .github/scripts/checks.mjs --worktree` passes.
- [x] 7.2 At archive, set `openspec/specs/browser-logins/spec.md`'s Purpose to name the personal browser instead of agent-browser; verify `openspec validate --specs --strict` passes.

## 8. Verification

- [x] 8.1 On this machine with a real camofox, run one errand end to end by hand: install through `BROWSE_NEEDS=install`, save a login through the password link's own routes as the page would, `login` on a public practice login site with its published test account, restart the server, and find the site still logged in.
- [x] 8.2 Run two sessions at once on a real camofox and confirm neither closes the other's page or logs it out.
- [x] 8.3 Confirm with a network capture or camofox's log that a forced page failure sends nothing to `camofox-telemetry.askjo.workers.dev`.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 8045 -->
# Spec Delta

## ADDED Requirements

### Requirement: Logins persist in the personal browser

Once a site accepts the person's login in the personal browser, that login SHALL be saved to the person's home folder at once, outside any repo, and SHALL survive a restart of the browser or the computer, for every repo on the machine. A login SHALL NOT be lost because the browser stopped before the task ended.

#### Scenario: A later visit after a restart

- **WHEN** the person logged in to a site yesterday and the computer restarted overnight
- **THEN** today's task opens the site already logged in

#### Scenario: The browser stops mid-task

- **WHEN** the browser stops right after a login was accepted
- **THEN** the next task still finds that login

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own pages in the one personal browser and the same saved logins, without waiting on each other and without one closing the other's pages. Preview checks SHALL NOT use the personal browser or its logins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own pages, and neither reports the browser busy

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's logins

### Requirement: A site that refuses the browser ends with steps for the person

When a site shows a check the personal browser does not clear, or refuses it, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. It SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page
- **THEN** the agent sends no private link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and gives the steps to do it on their own device

### Requirement: The personal browser reports nothing to its makers

The agent SHALL run the personal browser with its usage and failure reporting switched off, every time it starts it, and the browser SHALL listen only on the computer it runs on.

#### Scenario: A page fails to load

- **WHEN** a site hangs or crashes a page during a task
- **THEN** no report naming the site, even in hashed form, leaves the computer

### Requirement: An update leaves earlier saved logins untouched

An update that moves personal browsing to a new browser SHALL NOT delete, read, or copy the passwords and sessions the earlier browser held. The first task that meets a login on each site SHALL treat it as a site with no saved login.

#### Scenario: A first errand after the update

- **WHEN** a task opens a site the person had saved a login for before the update
- **THEN** the agent asks whether they are ready and sends the password link with the site filled in, and the earlier store is unchanged

## MODIFIED Requirements

### Requirement: The person does each login once

The agent SHALL log in with a login the person saved, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password. Saved passwords SHALL live in one file in the person's home folder, outside any repo and readable only by their user, which only the password link writes and only the program that types a login reads. The agent SHALL learn only the names of saved logins and whether a login was accepted.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A step only the person can do on the page (a picture puzzle, a passkey or device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. The agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

## REMOVED Requirements

### Requirement: One persistent profile keeps logins

**Reason**: The personal browser no longer uses a Chrome profile set in agent-browser's config.
**Migration**: "Logins persist in the personal browser" carries the promise. An existing `profile` setting is left as it is; `/verify` ignores it as before.

### Requirement: Personal browsing runs one task at a time

**Reason**: The one-at-a-time limit came from Chrome's profile lock, which the personal browser does not have.
**Migration**: "Browsing tasks share the personal browser" replaces it and keeps preview checks apart.

### Requirement: Personal browsing follows the installed tool's guide

**Reason**: Personal browsing runs through WongStack's own script, documented in the browsing guide, not agent-browser's served guide.
**Migration**: None for personal browsing. `/verify` keeps its own guide requirement in `staging-walkthrough`.

### Requirement: A site that blocks the agent's browser moves to the cloud browser

**Reason**: The person dropped Cloudflare's browser; one browser that more sites accept replaces the fallback.
**Migration**: "A site that refuses the browser ends with steps for the person". A task that named a cloud browser session opens the site in the personal browser.

### Requirement: A site's login carries over between the browsers

**Reason**: There is one browser, so no login moves.
**Migration**: None.

### Requirement: The agent never disguises its browser

**Reason**: The person removed the rule on 2026-10-07; the personal browser presents itself as an ordinary browser.
**Migration**: The limits that remain (no hired network address, no check-solving service, no solving a human check) sit in "A site that refuses the browser ends with steps for the person".

### Requirement: One setting picks the first browser

**Reason**: There is one browser to pick.
**Migration**: A saved *cloud first* setting is ignored.

### Requirement: A cloud browser session ends with its task

**Reason**: No cloud browser session exists.
**Migration**: None.

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1977 -->
# Spec Delta

## ADDED Requirements

### Requirement: One user token widens itself unasked

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL NOT grant a permission no WongStack feature uses, and SHALL leave in place a permission an earlier version granted. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered, with one exception: when the caller will finish open without login, an Access check still refused after the full propagation wait SHALL NOT stop the widen, and provisioning's Zero Trust step SHALL decide whether to open or stop.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted, the cloud browser's not among them

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: Access stays refused on the open path

- **WHEN** the caller will finish open and Cloudflare still refuses an Access check after the full wait, while the database check passes
- **THEN** the widen finishes, and the Zero Trust step opens the site only if Cloudflare refuses the organization, stopping on anything else

## REMOVED Requirements

### Requirement: One user token widens itself without asking

**Reason**: Its cloud-browser sentence and scenario go with Cloudflare's browser; a MODIFIED block can not drop a scenario.
**Migration**: "One user token widens itself unasked" carries every other promise. A token that already holds the cloud browser's permission keeps it.

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/dependencies/spec.md utf8 850 -->
# Spec Delta

## ADDED Requirements

### Requirement: Personal browsing adds one browser on first use

Browsing as the person SHALL need one tool beyond `/verify`'s: the personal browser, installed into the person's home folder the first time a browsing task needs it, with the versions WongStack has tried and no others. Before installing, the agent SHALL ask once, naming the disk and memory it needs. It SHALL add nothing to the repository and SHALL need no admin password.

#### Scenario: A first errand

- **WHEN** a task first needs to browse as the person on a machine without the personal browser
- **THEN** the agent says what the install needs, asks, installs it into the home folder, and carries on with the task

#### Scenario: A later errand

- **WHEN** a later task browses as the person
- **THEN** it asks nothing and installs nothing

<!-- end specs/dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-07

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 50101 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), its one request sends the saved notes to the chat.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-08-browse-with-camofox</title>
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
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-08-browse-with-camofox">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-08-browse-with-camofox</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Some sites turn the assistant's browser away, and the fallback to Cloudflare's browser adds a second browser, a login to copy across, and a rule page, yet still fails on sites like DoorDash. Camofox is one browser that more sites let in: in a trial on 2026-10-07 it opened Uber Eats 10 times out of 10 where today's browser was stopped, ran 530 steps without a crash, and kept a real Amazon login across a restart.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>BREAKING: your errands run in camofox, a browser more sites let in.</b> Booking, ordering, and anything else the assistant does on your accounts moves to it. Checking a preview of your own app stays on today's browser.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">            │ today's   │ camofox</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">            │ browser   │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">────────────┼───────────┼──────────</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Uber Eats   │ blocked   │ loads</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">Amazon      │ loads     │ loads</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">DoorDash    │ blocked   │ blocked</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">your errands│ before    │ +now</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">preview     │ stays     │ no</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">checks      │           │</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>BREAKING: Cloudflare's browser is gone.</b> A blocked site no longer moves to a second browser, so no login is copied between two browsers and <i>use the cloud browser first</i> stops working. A site that still refuses, like DoorDash, ends as today: the assistant stops and gives you numbered steps to finish on your own device.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                   AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">own browser              camofox</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">    │ blocked               │ blocked</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">    ▼                       ▼</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">Cloudflare's browser     steps for you</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">    │ blocked</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">    ▼</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">steps for you</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The no-disguise rule is removed.</b> The guides no longer say the assistant never changes how its browser looks to a site. Camofox presents itself as an ordinary browser; that is why more sites load.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Still yours: puzzles, passkeys, and device checks.</b> The assistant does not solve a <i>prove you are human</i> puzzle, and cannot give a fingerprint or approve on your phone. It stops and gives you the steps, as today.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>BREAKING: saved passwords move to a plain file on your computer.</b> The password link looks and works as today. What you save now goes into one file in your home folder that only your user can read, not into today's locked store. A small program reads the file and types the login into the site; the assistant still never sees a password, and learns only <i>logged in</i> or <i>not accepted</i>.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">you            form        program      site</span>
<span class="ln" data-note="item-5-line-2" tabindex="0"> │─ login ─────▶│</span>
<span class="ln" data-note="item-5-line-3" tabindex="0"> │              │─ save ─▶ file</span>
<span class="ln" data-note="item-5-line-4" tabindex="0"> │                           │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0"> │              assistant ──▶│ &quot;log in&quot;</span>
<span class="ln" data-note="item-5-line-6" tabindex="0"> │                           │── types ──▶│</span>
<span class="ln" data-note="item-5-line-7" tabindex="0"> │              assistant ◀──│ logged in</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>This can't be undone for logins you have today: you save them again.</b> Passwords in today's locked store and sites you are signed in to in today's browser do not carry over. The first time an errand meets each site, the assistant sends the password link. Nothing is deleted from the old store.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Card details still go through the private form, and are never kept.</b> The form looks the same. Its button types your card straight into the site and presses the site's button once; nothing is written to a file, and the assistant sees only how it ended.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>The first errand asks before a large download.</b> Camofox needs about 1.4 GB of disk and about 700 MB of memory while it runs. The assistant asks once, installs it into your home folder, and later errands start at once.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Two errands can run at once.</b> Today a second chat or a scheduled run finds the browser busy and waits. In camofox each gets its own pages and shares your logins.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>New installs stop giving your Cloudflare key the cloud browser's permission.</b> A key that already has it keeps it; nothing uses it.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>Nothing is reported to camofox's makers.</b> Camofox sends anonymous failure reports by default; the assistant turns that off every time it starts it.</div></div></li>
<li class="item card" id="item-12"><span class="num">12</span><div class="body"><div class="text" data-note="item-12" tabindex="0"><b>What stays the same.</b> The password link, the private form, and the key link look and close as today. Codes still come through the chat or your email. The assistant still shows a picture at each key moment and asks before it publishes, sends, books, pays, or deletes.</div></div></li>
</ol>
<p class="aside">Non-goals: a live view of the browser (a later change); solving puzzles; hiring a network address to get past DoorDash; moving preview checks to camofox; encrypting the passwords file; carrying old saved logins over; the unpublished practice-errands work (pull request #233).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked to look up camofox and try it in place of agent-browser → trialled it: it runs, and it disguises the browser, which the guides forbade.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked about the no-disguise rule → answered: <i>let's remove the rule from our docs it's a waste of space</i>.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked about saved passwords → answered: <i>just keep it in a local file for now saved somewhere</i>.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked about Cloudflare's browser → answered: <i>no need for cloudflare browser</i>.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether camofox crashes or is unreliable → ran 530 steps over 16 minutes with no crash; two faults found and worked around (the browser driver pin, and a retry for the first click after a start).</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether logins should be headless, with the form saving to a file the assistant reads → chose headless with the form and a file, with one change he accepted: a script reads the file and types, not the assistant.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether a plain passwords file is acceptable → answered: <i>that's fine if someone can get into the machine like it's already an L</i>.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked how this fits with the unpublished practice-errands change (pull request #233) → chose keep going here.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether the live view belongs in this change → first answered <i>can you solve those</i>; told the assistant does not solve puzzles and cannot do passkeys or device checks. Asked again → chose later, as its own change.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether this change also removes agent-browser → told <code>/verify</code> still needs it; he first asked to move <code>/verify</code> too, <i>rather have fewer dependencies then carry two</i>, then withdrew: <i>actually nevermind you're right</i>. Preview checks stay on agent-browser. Found while checking: camofox has no way to send the extra request headers <code>/verify</code> uses to pass a preview's login wall.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: card details go from the form straight into the site and are never written to a file, because a card on disk outlives its one use; said in the chat, not objected to.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the assistant asks once before the 1.4 GB install and puts it in the home folder, because a download that size should not start unasked and a home-folder install needs no admin password.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: old saved logins are left where they are and not copied, because today's store gives out no password to copy and deleting it could not be undone.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: two errands may run at once, because the one-at-a-time rule came from Chrome's profile lock and camofox keeps each task's pages apart; the trial ran two chats at once.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: new installs stop granting the cloud browser's Cloudflare permission and existing keys keep it, because a key should not hold a permission nothing uses and narrowing a live key is a separate, riskier step.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: camofox's failure reporting is switched off, because it names the sites a person visits to a third party, even hashed.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a site camofox can't open ends with steps for the person, with no second browser and no hired network address, because he dropped Cloudflare's browser and the trial showed DoorDash refusing both.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the plan's last task, save and confirm CI, is left to publishing, because <code>/ship</code> makes the one checkpoint and its gate is CI; the end-to-end check uses a public practice login, because no real account should be used unasked.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-07</p>Check: <code>scripts/tests/cloud-browser.test.mjs</code> is deleted with <code>cloud-browser.mjs</code>, the only code it tested; every test in it was read first, and none guards a file that stays. <code>scripts/tests/browse.test.mjs</code> tests the script that replaces it.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Building: the tests that faked <code>agent-browser</code> in <code>scripts/tests/hand-over.test.mjs</code>, <code>form.test.mjs</code>, and <code>passwords.test.mjs</code> now run against a fake camofox server. The tests of the live feed's key presses and of stopping a blocked password save are gone with that code: a save is now one file write. Every test and check runs once, at the end of the build, not after each task.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Building: the private form never retries a step and never starts the browser, where the plan's one retry would apply, because a reopened page has lost what was typed, and a second press could pay twice. <code>login</code> follows the same rule.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Building: camofox's server keeps no log file, because camofox logs a failed typing step's detail, which can quote a password or a card number.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Building: <code>login</code> prints a fourth result, <code>typed</code>, for a step with no password box (an email, then <i>Continue</i>), because such a page often keeps its address and would read as <i>rejected</i>.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-08</p>Assumed: the end-to-end check's <i>still logged in after a restart</i> step is shown by a cookie that survived a hard kill and a restart, because the public practice login site keeps no session to check; a real Amazon login survived a restart in the trial.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-08</p>Archive checkpoint: built, tried on a real camofox (saving through a hard kill, a practice login, two sessions at once, a framed card box, no report sent), main merged in with five files resolved by hand, numbered 38.0.0.</li>
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
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
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
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
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
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
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) { if (r.ok) setLive(key); }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
