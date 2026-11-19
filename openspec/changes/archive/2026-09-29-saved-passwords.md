<!-- openspec-archive v1 2026-09-29-saved-passwords -->
<!-- file proposal.md utf8 9668 -->
# Save your passwords for the agent's browser

**Status:** ready-to-ship
**Branch:** agent-password-autofill
**Open questions:** none

## Why

When a site logs you out, the agent has to send you a link so you can log in again, every time. You already keep your passwords in a password manager, but the agent has no way to use them. This change lets you give it the logins you choose, without the agent ever seeing a password and without any setup.

## What Changes

- **A private link to save logins.** Say *save my passwords* or *add my Netflix login*. The agent asks if you're ready, then sends a private link like the hand-over link. It closes when you tap *Done*, or after 10 minutes. The page gives you two ways in.
  ```text
  ┌──────────────────────────────┐
  │ Save logins for your agent   │
  │                              │
  │ [ Upload a password export ] │
  │ [ Add one login            ] │
  │                              │
  │ Keep bank and email out,     │
  │ unless you trust the agent   │
  │ with them.                   │
  └──────────────────────────────┘
  ```
- **Upload an export, then tick what the agent may use.** Export your passwords from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox as a CSV file, and pick it on the page. The page lists every site in it, none ticked. You tick the ones the agent may use and tap *Save*. Your phone or laptop reads the file itself: only the logins you tick leave it, and the rest never go anywhere.
  ```text
  ┌──────────────────────────────┐
  │ 212 logins in your file      │
  │ [ Search sites…            ] │
  │                              │
  │ [ ] amazon.com   me@mail.com │
  │ [x] costco.com   me@mail.com │
  │ [x] netflix.com  me@mail.com │
  │ [ ] ...                      │
  │                              │
  │ [ Save 2 logins ]            │
  └──────────────────────────────┘
  ```
  A file it can't read says so: *This file isn't a password export. Export as CSV from your password manager.*
- **Or add one login.** A small form asks for the website, your email or username, and your password. Your password manager or phone fills it: the page isn't Netflix's own, so you pick the Netflix login from its list. Or you type it.
  ```text
  ┌──────────────────────────────┐
  │ Add a login                  │
  │ Website                      │
  │ [ netflix.com              ] │
  │ Email or username            │
  │ [ me@mail.com              ] │
  │ Password                     │
  │ [ ••••••••                 ] │
  │                              │
  │ [ Save ]                     │
  └──────────────────────────────┘
  ```
- **Saved, then done.** The page says what it saved and reminds you to delete the export file from your computer. You can add another or tap *Done*, which closes the link. In the chat, the agent names the sites it saved, never a password.
  ```text
  ┌──────────────────────────────┐
  │ Saved 2 logins:              │
  │ costco.com, netflix.com      │
  │                              │
  │ Now delete the export file   │
  │ from your computer.          │
  │                              │
  │ [ Add another ]   [ Done ]   │
  └──────────────────────────────┘
  ```
- **The agent logs in for you.** When a site asks you to log in and you saved a login for it, the agent fills it in and carries on, without asking. If the login fails, or the site asks for a code sent to you, it hands you the browser as it does today. With two saved accounts for one site, it asks you in the chat which one to use.
  ```text
  site asks to log in
          │
     saved login?
    ┌─────┴─────┐
   yes          no
    │           │
    ▼           │
  agent fills   │
  it in         │
    │           │
  worked? ─no──▶┤
    │ yes       ▼
    ▼       hand-over link
  carry on
  ```
- **Change or forget one in the chat.** Saving the same site and username again replaces the old password, so a changed password is fixed by adding it again. Say *forget my Netflix login* and it's gone. Say *which logins do you have?* and the agent lists the sites.
- **Where they're kept.** Logins stay on the computer the agent runs on, in the browser tool's own locked store, never in your repo. The key to that store sits on the same computer. So it stops a copied or backed-up file from exposing them, but not someone with full access to that computer. That's why the page says to keep bank and email out.

Non-goals: no direct connection to a password manager, no passkeys, and no saved one-time codes; a code still goes through the hand-over link. No saving of a password you type during a hand-over.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the agent may store logins the person gives through the password link, in agent-browser's encrypted auth vault, and log in with them; it still never asks for, reads, or shows a password. Adds the password link, and logging in with a saved login.

## Impact

- `.agents/skills/verify/scripts/passwords.mjs` (new): the password link's routes, a keyed `POST /save` that runs `agent-browser auth save <name> --url <url> --username <user> --password-stdin` per login, and `POST /done`.
- `.agents/skills/verify/scripts/passwords-page.html` and `passwords-page.mjs` (new): the page, its CSV reading, and its forms.
- `.agents/skills/verify/scripts/hand-over.mjs`: `open --passwords` serves the password page on the same private link, lock, and 10-minute close, with no live view; `wait` also prints the saved site names. The open `phone-sized-hand-over` plan also edits this file.
- `scripts/tests/passwords.test.mjs` (new), and `scripts/tests/cli-conventions.test.mjs` gains the new script.
- `wiki/development/browsing.md`: *Saved browser logins* rewritten, plus a new *Save your passwords* section. `wiki/stack/api-keys.md`: one line.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-29** — Asked how passwords should reach the agent: connect 1Password directly, or export and import → chose export and import, because connecting felt like too much setup.
- **2026-09-29** — Asked whether a non-technical owner could do it, and whether they must copy every password → chose one private page with two ways in: upload an export and tick the sites, or add one login.
- **2026-09-29** — Asked what happens without 1Password → chose to support any password manager that exports CSV, plus typing a login by hand.
- **2026-09-29** — Asked how to handle the open phone-sized hand-over plan, which touches the same hand-over script → chose to keep going here; whichever publishes second catches up.
- **2026-09-29** — Assumed: the person's own device reads the export file and sends only the ticked logins, because the rest then never leave it, and no file lands on the server to delete.
- **2026-09-29** — Assumed: the page finds the site, username, and password columns by their names, because every major password manager's CSV names them. A 1Password `.1pux` or a JSON export gets the "export as CSV" message.
- **2026-09-29** — Assumed: one-time code secrets, notes, and other extras in the export are dropped, because the store holds only site, username, and password, and codes stay with the person.
- **2026-09-29** — Assumed: the agent uses a saved login without asking, because ticking it was the permission. A failed login or a code page falls back to the hand-over link.
- **2026-09-29** — Assumed: the agent brings this up only when the person asks about passwords or logins, never on its own.
- **2026-09-29** — Assumed: logins go in agent-browser's own encrypted store, and the page and wiki say plainly that its key sits on the same computer. The alternative, a passphrase typed at each use, would need the person at every login.
- **2026-09-29** — Assumed: the password link reuses the hand-over link's safety: a new private address and secret key each time, the same ready question first, one link at a time, and a close on *Done* or after 10 minutes.
- **2026-09-29** — Assumed: a minor release, because it adds a feature and breaks nothing.
- **2026-09-29** — Assumed: `POST /save` reports failed logins by their place in the request, and the page skips rows the server would refuse, because the page must name the failed sites and keep them ticked.
- **2026-09-29** — Assumed: after the phone-sized hand-over shipped first, closing a password link skips its page resize, because a password link never touched the browser, and the deadline test got a 3-second limit instead of 0.6, because the shorter one could expire before the page started.
- **2026-09-29** — Assumed: tasks 1.5 and 3.1 are done, because CI passed on PR #200 with no edit to the CLI conventions test, which already lists `hand-over.mjs`.
- **2026-09-29** — Archive checkpoint: archived with its tasks complete, released as 27.2.0.

<!-- end proposal.md -->
<!-- file design.md utf8 8668 -->
# Design

## Context

See proposal.md for the why. Today `hand-over.mjs` owns the private link: a loopback server, a random 32-byte key in the URL fragment, a Cloudflare quick tunnel, a detached watcher, one link at a time through `~/.wong-stack/hand-over/`, and a 10-minute deadline. `browser-logins` forbids storing a password.

agent-browser 0.38.1 ships an auth vault (checked 2026-09-29 in a throwaway `HOME`):

- `auth save <name> --url <u> --username <u> --password-stdin` writes `~/.agent-browser/auth/<name>.json`, encrypted. The key is `~/.agent-browser/.encryption-key` beside it, and the password never appears in the file in clear.
- `auth list --json` returns `{name, url, username}` per login and never a password. Saving an existing name overwrites it.
- Names must match `^[a-zA-Z0-9_-]+$`, so `netflix.com` is refused and `netflix-com` works.
- `auth login <name> [--no-navigate] [--url <u>]` fills the login form and submits. `--url` sets the origin that the page must match.

## Goals / Non-Goals

**Goals:**
- One link lifecycle for hand-over and passwords: the same key, tunnel, lock, deadline, and ready question.
- A password travels once, from the person's device to `auth save`'s stdin. It never lands in argv, env, a log, `result.json`, or the agent's output.

**Non-Goals:**
- Reading 1Password `.1pux`, Bitwarden JSON, or encrypted exports.
- Matching saved logins across a site's sister domains beyond the rule below.

## Decisions

### A `--passwords` mode on `hand-over.mjs`, with the new parts in their own files

`hand-over.mjs open --passwords` reuses `open`, `watch`, `wait`, and `close` whole. In this mode it skips `prepareBrowser` and the live feed. It serves `passwords-page.html` and `passwords-page.mjs` in place of the hand-over page, and it mounts the routes from `passwords.mjs`. It has no `--until` finish: the link ends on `POST /done`, `close`, or the deadline.

- **Alternative:** a separate `passwords.mjs` CLI importing the tunnel and lock helpers. It would need most of `hand-over.mjs` exported, and a second lock to keep a hand-over and a password link from running at once. Rejected.
- **Cost:** a textual overlap with the `phone-sized-hand-over` plan's edits to the same file. Whichever lands second rebases.

### The device reads the export; only ticked logins travel

`passwords-page.mjs` reads the chosen file with `FileReader` and parses it with a pure, exported `parseExport(text)`:

- The parser follows RFC 4180: quoted fields, doubled quotes, newlines inside quotes, and a leading BOM.
- It finds columns by lowercased header aliases:
  - site: `url`, `login_uri`, `website`, `web site`
  - username: `username`, `login_username`, `login`, `email`, `user name`
  - password: `password`, `login_password`
  - label: `name`, `title`
- It adds `https://` to a bare site, such as `netflix.com`.
- It skips a row with no username or password, a line break in the username, or a field over 1,024 characters, since the server would refuse it. It also skips a row whose URL isn't `http(s)`, such as an Android `android://` entry, and a repeat of the same host and username.
- A file with no site or password column returns `null`, and the page shows the "export as CSV" message.

The list shows each login as host plus username, sorted by host, with none ticked, and a search box filters it. *Save* posts only the ticked logins. The file is never uploaded, so the server has nothing to delete.

### `POST /save` and `POST /done`

Both need the `x-hand-over-key` header, as the field routes do.

`/save` takes `{logins: [{url, username, password}]}`:
- It accepts up to 500 logins, a 256 KB body, and 1,024 characters per field. It gets its own body limit, because `BODY_LIMIT` is 4 KB.
- It rejects a non-`http(s)` URL, and it refuses a CR or LF in the username.

For each login, it reads the current `auth list --json` once and chooses a name:
- The same host and username as an existing login reuses that name, so a new password replaces the old.
- Otherwise the name is `slug(host)`: the host lowercased, `www.` stripped, and each run of other characters turned into `-`. A second account on the same host gets `-2`, then `-3`, and so on.

It then runs `execFile('agent-browser', ['auth', 'save', name, '--url', url, '--username', username, '--password-stdin'])` and writes the password to stdin. It never builds a shell string. It replies `{saved: [{name, host}], failed: [index]}`, where `failed` lists the positions in the request's `logins` that didn't save. The page shows the saved hosts and keeps the failed ones ticked.

It adds each saved name to the watcher's in-memory list. `/done` finishes the watcher with `done`. `teardown` writes `{result, saved: [names]}` to `result.json`, and `wait` prints `HANDOVER_SAVED=<name>,<name>` after `HANDOVER_RESULT`.

### Logging in with a saved login

`browsing.md` gains the steps. When a task meets a login form:
1. The agent reads `agent-browser auth list --json` and matches the page's host against each login's URL host. The two hosts match when they're equal, or when one ends with `.` plus the other's registrable part after stripping `www.`. So `login.netflix.com` matches `netflix.com`.
2. With one match, it runs `auth login <name> --no-navigate --url <page origin>`. It then checks the address left the login page. It never passes a password.
3. With two matches, it asks in the chat which account to use. With none, or a failure, or a code page, it runs the hand-over as today.

This is agent guidance, not a script, because each site's login differs and the fallback is the hand-over the agent already runs.

## UX

### Use-case brief

The owner, or a teammate, not technical, gives the agent the logins it needs, once, often from a phone. They're done when the page names the saved sites and the chat confirms them.

- **Common case:** add one or two logins from a phone, filled from saved passwords.
- **Edge case:** a 200-row export from a laptop, of which they tick five.
- **Frequency:** once at setup, then rarely, when a password changes.

It mirrors the hand-over page: same private link, same look, and no live view.

### Flow

1. The person asks. The agent asks *Ready, send the link / Not now*, then sends the link.
2. The start screen offers *Upload a password export* or *Add one login*.
3. **Export:** they pick a file, tick sites, and tap *Save N logins*. The saved screen follows.
4. **Add one:** they fill the form and tap *Save*. The saved screen follows.
5. On the saved screen, *Done* closes the link and *Add another* returns to the start screen. The agent names the saved sites in the chat.

An unreadable file shows its message on the start screen. A failed save names the sites that failed and keeps them ticked.

### Hierarchy

- **Start screen:** two equal choices, with the bank-and-email note under them.
- **Tick list:** *Save N logins*. The search box is secondary.
- **Add one:** *Save*.
- **Saved screen:** *Done*. *Add another* is secondary.

### Review

[review.html](review.html). What Changes items 1 to 4 sketch the start screen, the tick list with its error line, the add-one form, and the saved screen. Item 5 draws the login flow.

### Components

The hand-over page's plain HTML and CSS, reused as-is: its header, buttons, and field boxes. New pieces:
- A file input with `accept=".csv,text/csv"`.
- A filtered checkbox list.
- The add-one form, with `autocomplete="url"`, `"username"`, and `"current-password"`, so managers offer their fill.

## Risks / Trade-offs

- **Anyone with the computer can read the logins.** The vault's key sits beside it, so anyone with the person's account on that computer, the agent included, can decrypt the vault. → The page, the wiki, and the changelog say so plainly, and advise keeping bank and email out. The agent's rules forbid reading `~/.agent-browser/auth/`.
- **Password managers won't autofill by site.** The page's address is a tunnel domain, so no manager autofills by site. → The form says to pick the site's login from the manager's list. Typing still works.
- **Some logins may defeat `auth login`.** A two-step login, with the username on one page and the password on the next, or an unusual form, may not work. → It falls back to the hand-over. A memory thread checks the first real saved login.
- **The username shows up in the process list.** It's in `auth save`'s argv, so the machine's process list shows it for a moment. → That's acceptable, since a username isn't a secret. The password goes only through stdin.

## Open Questions

- Does `auth login` handle a two-step login? Only the fallback depends on it; the first real use answers it.

<!-- end design.md -->
<!-- file tasks.md utf8 3342 -->
# Tasks

## 1. Scripts

- [x] 1.1 Add `--passwords` to `hand-over.mjs open`: skip `prepareBrowser` and the live feed, serve `passwords-page.html` and `passwords-page.mjs`, mount the `passwords.mjs` routes, and finish only on `/done`, `close`, or the deadline; update the header comment and usage. Verify with tests in `scripts/tests/passwords.test.mjs` that a passwords link refuses to open while a hand-over is open, and the reverse.
- [x] 1.2 Write `passwords.mjs`: the keyed `POST /save` and `POST /done`, the name choice (`slug(host)`, reuse on the same host and username, `-2` for a second account), the limits (500 logins, 256 KB, 1,024 characters a field), and `auth save` through `execFile` with the password on stdin. Verify with tests using a fake `agent-browser` on `PATH`: a wrong key gets 403, the password reaches only stdin and never argv or the log, an over-limit body is refused, a repeat replaces, and a second account gets `-2`.
- [x] 1.3 Record the saved names: `teardown` writes `saved` to `result.json`, and `wait` prints `HANDOVER_SAVED=`. Verify with a test that `wait` prints the names and nothing else from the request.
- [x] 1.4 Write `passwords-page.html` and `passwords-page.mjs`: the start screen, the file reading with an exported `parseExport`, the tick list with search and none ticked, the add-one form with `autocomplete` marks, the saved screen, and the unreadable-file and failed-save states, mirroring the hand-over page. Verify with `parseExport` tests on sample exports from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, and Firefox, plus quoted commas, a newline inside quotes, a BOM, an `android://` row, and a non-export file.
- [x] 1.5 Add `hand-over.mjs`'s new flag to `scripts/tests/cli-conventions.test.mjs` if its conventions list needs it, and verify the test suite passes in CI with `/save`.

## 2. Docs

- [x] 2.1 Rewrite *Saved browser logins* in `wiki/development/browsing.md`: the agent never asks for a password in the chat; it logs in with a saved login when one matches, by the matching rule, and hands over otherwise. Add a *Save your passwords* section: the ask, the two ways in, where logins are kept and what that protects against, keep bank and email out, change or forget one in the chat, and `hand-over.mjs open --passwords`. Verify with `node scripts/check-payload-links.mjs`.
- [x] 2.2 Add one line to `wiki/stack/api-keys.md` pointing to *Save your passwords*, and update the `AGENTS.md` browsing rule's links if the heading list changes. Verify the links resolve with `node scripts/check-payload-links.mjs`.
- [x] 2.3 Add a `## Next (minor) — Save your passwords for the agent's browser` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand; say *save my passwords* to start. Verify it sits at the top of the entries.

## 3. Integration

- [x] 3.1 Run `openspec validate saved-passwords --strict --no-interactive` and `node scripts/measure-context.mjs --check`, and pass CI through `/save`.
- [x] 3.2 Try a real password link on a phone, with the add-one form filled from saved passwords, then a task that logs in with the saved login. Record the result, or a memory `thread` fact if it can't be tried before publishing. Recorded as a memory thread on 2026-09-29; a local phone-size walk with a fake store passed.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 2458 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The person does each login once

The agent SHALL hand the browser to the person to log in, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password anywhere but the browser tool's encrypted login store, which only the person fills through the password link.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

## ADDED Requirements

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, closing on *Done* or after 10 minutes. The link's page SHALL take a CSV password export or one login typed or autofilled. For an export, the person's device SHALL read the file and list its sites with none ticked, and only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-one form from their phone's saved passwords and taps *Save*
- **THEN** that login is saved, and no command, log, file in the repo, or chat message holds its password

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When it fails, or the site then asks for a code, the agent SHALL hand the browser over as for any login. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, with no hand-over

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and hands the browser over

<!-- end specs/browser-logins/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 45213 fence=~~~ -->
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
<title>Review · 2026-09-29-saved-passwords</title>
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
<body data-change="2026-09-29-saved-passwords">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-saved-passwords</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When a site logs you out, the agent has to send you a link so you can log in again, every time. You already keep your passwords in a password manager, but the agent has no way to use them. This change lets you give it the logins you choose, without the agent ever seeing a password and without any setup.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A private link to save logins.</b> Say <i>save my passwords</i> or <i>add my Netflix login</i>. The agent asks if you're ready, then sends a private link like the hand-over link. It closes when you tap <i>Done</i>, or after 10 minutes. The page gives you two ways in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">│ Save logins for your agent   │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│                              │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ [ Upload a password export ] │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ [ Add one login            ] │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│                              │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ Keep bank and email out,     │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ unless you trust the agent   │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ with them.                   │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Upload an export, then tick what the agent may use.</b> Export your passwords from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox as a CSV file, and pick it on the page. The page lists every site in it, none ticked. You tick the ones the agent may use and tap <i>Save</i>. Your phone or laptop reads the file itself: only the logins you tick leave it, and the rest never go anywhere. A file it can't read says so: <i>This file isn't a password export. Export as CSV from your password manager.</i></div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ 212 logins in your file      │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ [ Search sites…            ] │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ [ ] amazon.com   me@mail.com │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ [x] costco.com   me@mail.com │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ [x] netflix.com  me@mail.com │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ [ ] ...                      │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ [ Save 2 logins ]            │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Or add one login.</b> A small form asks for the website, your email or username, and your password. Your password manager or phone fills it: the page isn't Netflix's own, so you pick the Netflix login from its list. Or you type it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Add a login                  │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Website                      │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ [ netflix.com              ] │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ Email or username            │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ [ me@mail.com              ] │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ Password                     │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ [ ••••••••                 ] │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│                              │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">│ [ Save ]                     │</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Saved, then done.</b> The page says what it saved and reminds you to delete the export file from your computer. You can add another or tap <i>Done</i>, which closes the link. In the chat, the agent names the sites it saved, never a password.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">│ Saved 2 logins:              │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ costco.com, netflix.com      │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│                              │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Now delete the export file   │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ from your computer.          │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│                              │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ [ Add another ]   [ Done ]   │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The agent logs in for you.</b> When a site asks you to log in and you saved a login for it, the agent fills it in and carries on, without asking. If the login fails, or the site asks for a code sent to you, it hands you the browser as it does today. With two saved accounts for one site, it asks you in the chat which one to use.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">site asks to log in</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">        │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">   saved login?</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">  ┌─────┴─────┐</span>
<span class="ln" data-note="item-5-line-5" tabindex="0"> yes          no</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">  │           │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">  ▼           │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">agent fills   │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">it in         │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">  │           │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">worked? ─no──▶┤</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">  │ yes       ▼</span>
<span class="ln" data-note="item-5-line-13" tabindex="0">  ▼       hand-over link</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">carry on</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Change or forget one in the chat.</b> Saving the same site and username again replaces the old password, so a changed password is fixed by adding it again. Say <i>forget my Netflix login</i> and it's gone. Say <i>which logins do you have?</i> and the agent lists the sites.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Where they're kept.</b> Logins stay on the computer the agent runs on, in the browser tool's own locked store, never in your repo. The key to that store sits on the same computer. So it stops a copied or backed-up file from exposing them, but not someone with full access to that computer. That's why the page says to keep bank and email out.</div></div></li>
</ol>
<p class="aside">Non-goals: no direct connection to a password manager, no passkeys, and no saved one-time codes; a code still goes through the hand-over link. No saving of a password you type during a hand-over.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked how passwords should reach the agent: connect 1Password directly, or export and import → chose export and import, because connecting felt like too much setup.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether a non-technical owner could do it, and whether they must copy every password → chose one private page with two ways in: upload an export and tick the sites, or add one login.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked what happens without 1Password → chose to support any password manager that exports CSV, plus typing a login by hand.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked how to handle the open phone-sized hand-over plan, which touches the same hand-over script → chose to keep going here; whichever publishes second catches up.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the person's own device reads the export file and sends only the ticked logins, because the rest then never leave it, and no file lands on the server to delete.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the page finds the site, username, and password columns by their names, because every major password manager's CSV names them. A 1Password <code>.1pux</code> or a JSON export gets the &quot;export as CSV&quot; message.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: one-time code secrets, notes, and other extras in the export are dropped, because the store holds only site, username, and password, and codes stay with the person.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the agent uses a saved login without asking, because ticking it was the permission. A failed login or a code page falls back to the hand-over link.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the agent brings this up only when the person asks about passwords or logins, never on its own.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: logins go in agent-browser's own encrypted store, and the page and wiki say plainly that its key sits on the same computer. The alternative, a passphrase typed at each use, would need the person at every login.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the password link reuses the hand-over link's safety: a new private address and secret key each time, the same ready question first, one link at a time, and a close on <i>Done</i> or after 10 minutes.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: a minor release, because it adds a feature and breaks nothing.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>POST /save</code> reports failed logins by their place in the request, and the page skips rows the server would refuse, because the page must name the failed sites and keep them ticked.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: after the phone-sized hand-over shipped first, closing a password link skips its page resize, because a password link never touched the browser, and the deadline test got a 3-second limit instead of 0.6, because the shorter one could expire before the page started.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: tasks 1.5 and 3.1 are done, because CI passed on PR #200 with no edit to the CLI conventions test, which already lists <code>hand-over.mjs</code>.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-29</p>Archive checkpoint: archived with its tasks complete, released as 27.2.0.</li>
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
