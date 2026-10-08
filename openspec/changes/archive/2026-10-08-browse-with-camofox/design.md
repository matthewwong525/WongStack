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
