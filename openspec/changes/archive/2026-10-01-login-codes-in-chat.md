<!-- openspec-archive v1 2026-10-01-login-codes-in-chat -->
<!-- file proposal.md utf8 8107 -->
# Log in with fewer taps: a ready password page, and codes through the chat

**Status:** ready-to-ship
**Branch:** 1password-login-sharing
**Open questions:** none

## Why

When the agent meets a login it has no password for, or a site sends a code, it sends you a link to its live browser. Then you have to find the boxes on a small screen and type. A login only needs your username and password. A code only needs six digits, and many codes come by email, which the agent can often read itself. We want you to type as little as possible, and get the live browser only for steps only you can do on the page.

## What Changes

- **No saved password? You get the password page, with the website already filled in.** It's the same page you use to save logins from your password manager. The website box already says the site, so you only fill your username and password, or pick them from your password manager. You can still drop an export file there too. Tap *Save and continue*, and the agent logs in with it and carries on.
  ```text
  ┌──────────────────────────────┐
  │ Save your Netflix login      │
  │                              │
  │ Website                      │
  │ [ netflix.com              ] │
  │ Email or username            │
  │ [                          ] │
  │ Password                     │
  │ [                          ] │
  │                              │
  │ or drop your export file     │
  │                              │
  │ [ Save and continue ]        │
  └──────────────────────────────┘
  ```
- **A saved password that stopped working gets the same page**, with the website and your username filled in. You type only the new password, and it replaces the old one.
- **A code sent by email, the agent fetches itself.** When its browser is already signed in to that email, it opens only the newest message from that site, takes the code, and tells you in one line: *Got Netflix's code from your email.* It shows no picture of your inbox. If it can't find the code, it asks you in the chat.
- **A code sent to your phone or app is asked in the chat.** The agent says which site and where the code went, and you type it in the chat. The agent puts it in and carries on. No link, no *ready?* question.
  ```text
   login page
       │
       ▼
  saved password? ──no──▶ password page
       │ yes              (site filled in)
       ▼                        │
   agent logs in ◀──────────────┘
       │
       ▼
   code page?
   ┌───┴──────────┐
   ▼              ▼
  email        text / app
  agent reads  you type it
  it           in the chat
   └───┬──────────┘
       ▼
   logged in
  ```
- **"Approve on your phone" prompts need no link.** The agent tells you to tap *Yes* in the site's app and waits until the site lets it in.
- **A wrong or expired code is asked again in the chat.** The agent says so, asks the site for a new code when it offers one, and asks you again.
- **The live browser link is kept for what only you can do on the page:** picture puzzles, passkeys and Face ID, *Sign in with Google* or *Apple* buttons, backup or recovery codes, and sites that log in another way. If you're already in the browser link when the code arrives, you type it there, as now.
- **Nothing else changes.** Passwords still never go in the chat. Every action that pays, sends, or publishes still asks you in the chat first.

Non-goals: the agent storing your authenticator app's codes; logging in to your email just to fetch a code; changing how payment pages are handed over; solving any picture puzzle or check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a login with no saved or a rejected saved password goes to the password link with the site (and known username) filled in, not the hand-over; a one-time code after a saved login is fetched from the person's signed-in email or asked in the chat; an app approval is waited for in the chat; the hand-over keeps captchas, passkeys, single sign-on, backup codes, and other on-page-only steps.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: `open --passwords` takes `--site <url>` and `--username <user>`, carried in the link's `#` fragment beside the key.
- `.agents/skills/hand-over/scripts/passwords-page.mjs` and `passwords-page.html`: read the fragment, pre-fill the add-a-login form, title the page for the site, focus the first empty field.
- `scripts/tests/passwords-page.test.mjs`, `scripts/tests/hand-over.test.mjs`: coverage for the pre-fill and the new flags.
- `wiki/development/login-codes.md` (new leaf), `wiki/development/browsing.md`, `wiki/development/passwords.md`, `wiki/development/README.md`.
- `openspec/specs/browser-logins/spec.md` via the delta; `CHANGELOG.md` *Next (minor)* entry.
- Overlaps open PR #233 (practice errands), which edits `hand-over.mjs`, the browsing page's hand-over section, and grades a "log in with a code" errand; whichever publishes second lines up with the other.

## Decision log

- **2026-10-01** — Asked whether to share passwords through a 1Password link or an export, and to handle codes in the chat → chose: keep the existing export link for passwords; take codes in the chat; minimize what the person types, and hand over only picture puzzles, passkeys, and similar steps.
- **2026-10-01** — Asked how to handle open PR #233, which edits the same hand-over rules → chose to keep going here; whichever publishes second catches up.
- **2026-10-01** — Asked whether the agent may open the person's signed-in inbox to read an emailed code → chose yes: only the newest message from that site, no picture, one line in the chat saying it did.
- **2026-10-01** — Assumed: backup and recovery codes still go through the browser link, because they don't expire and would sit in the stored chat.
- **2026-10-01** — Assumed: the agent never logs in to email just to fetch a code, because that login may need its own code and loop.
- **2026-10-01** — Assumed: no storing of authenticator-app secrets, because agent-browser's login store holds only a username and password, and keeping both factors on one computer undoes the second factor.
- **2026-10-01** — Assumed: the payment-page rule from 2026-09-28 (the person types their email and ticks the terms in the hand-over) stays, because this change covers logins only; it can widen later.
- **2026-10-01** — Assumed: the rules live on a new wiki page linked from the browsing page, because the browsing page is near the 3,000-word limit and the open PR #233 adds to it.
- **2026-10-01** — Asked (as a note after review) that a login with no saved password send the person to the password page with the website filled in, like the export page, not the live browser → added it, plus the same page with site and username filled in for a rejected saved password.
- **2026-10-01** — Assumed: the site and username travel in the link's `#` part beside the key, because that part never reaches the server or a log, and the username is already known to the chat from the saved-login list.
- **2026-10-01** — Assumed: *Sign in with Google* or *Apple* and other non-password logins keep the live browser link, because there's no password to save.
- **2026-10-01** — Assumed: built tasks 1.1–3.1 and added the new page to `payload-files.json` so the payload link check counts it; task 3.2 waits on CI at this save.
- **2026-10-01** — Assumed: task 3.2 done, because CI passed on PR #237; every task is complete.
- **2026-10-01** — Asked, after seeing screenshots, to put the login form above the export box when a site is filled in → done; the export box below reads *Or drop your password export here*.
- **2026-10-01** — Assumed: archived and numbered 29.7.0 for publishing, because every task is done and CI passed.

<!-- end proposal.md -->
<!-- file design.md utf8 7090 -->
# Design

## Context

`wiki/development/browsing.md` step 2 sends "a code page" after a saved login to a hand-over, and the hand-over *When* bullet lists "a code sent to you". The `browser-logins` spec says the same, and sends a login with no saved or a rejected saved password to the hand-over too. The password link (`hand-over.mjs open --passwords`) already has an add-a-login form (Website, Email or username, Password) and reads its key from the link's `#key=` fragment. Saved passwords (`passwords.md`, 27.2.0) already remove the password step, so a code is now the most common reason a login still needs the link. The page is at 2,346 words against the 3,000-word check, and open PR #233 adds about 150 words to its hand-over section.

## Goals / Non-Goals

**Goals:**
- A password login with no saved password takes the password page with the site filled in, never the live browser.
- A rejected saved password takes the same page with site and username filled in.
- A code step after a saved login takes zero or one chat reply, never a link.
- Emailed codes come from the person's already-signed-in inbox when possible.
- The hand-over keeps only steps that need the person on the page.

**Non-Goals:**
- Storing authenticator-app secrets: `agent-browser auth` holds only a username and password, and both factors on one computer undo the second factor.
- Logging in to email to fetch a code.
- Script changes for codes: the agent already drives the page with `agent-browser fill`/`click`.
- Payment-page hand-overs (the 2026-09-28 email-and-terms rule stays).

## Decisions

- **`open --passwords` takes `--site <url>` and `--username <user>`.** Both only with `--passwords`; either alone is a usage error otherwise. `--site` must be an http(s) URL or a bare host (normalised by the page's existing `siteUrl`). They ride in the printed link's fragment: `HANDOVER_LINK=<origin>/#key=<key>&site=<url>&user=<username>`, URL-encoded. The fragment never reaches the server or the tunnel's logs; the page already strips it with `history.replaceState`. Alternative: a keyed `GET /prefill` route, rejected as more surface for the same result.
- **The page pre-fills, nothing more.** `passwords-page.mjs` reads `site` and `user` beside `key`, sets the form's Website (and username) fields, changes the heading to *Save your <host> login*, and focuses the first empty field. A filled form is already saved by *Save and continue* without tapping *Add* (27.4.0), so one tap finishes. The export drop and list stay as they are. Pre-filled values stay editable.
- **When the agent sends it.** On a login page with a password field and no matching saved login, ask *I need your Netflix login. I'll send the page to save it.* `Ready, send the link / Not now`, then `open --passwords --site https://www.netflix.com/login`. On `HANDOVER_SAVED`, run `auth login <name> --no-navigate --url <page origin>` as for any saved login. A rejected saved login does the same with `--username` from `auth list`; saving the same host and username replaces the password (existing `chooseName`). A login page with no password field (single sign-on buttons, passkey, magic link) keeps the hand-over. `passwords.md`'s "never on its own" line changes to allow this one offer.

- **A new leaf page, `wiki/development/login-codes.md`, owns the how.** `browsing.md` keeps one-line pointers in step 2 and in the hand-over *When* bullet; the hub `wiki/development/README.md` lists it under Browsing beside `passwords.md`. This keeps `browsing.md` under the word limit and away from PR #233's edits. Alternative: a section in `browsing.md`, rejected for both reasons.
- **Spot the code step by the page, not a script.** After `auth login`, the agent snapshots the page; a field labelled code, OTP, verification, or 2FA, or an `autocomplete="one-time-code"` field, marks a code step. Text like "check your phone" or "approve in the app" with no field marks an app approval. A "backup code" or "recovery code" field goes to the hand-over.
- **Where the code went decides the source.** The page usually says it (*We sent a code to j\*\*\*@gmail.com* / *to •••• 1234*). Email → try the inbox; text or authenticator app → ask in chat; unclear → ask in chat.
- **Reading the inbox.** Pick the webmail from the saved login's username domain: `gmail.com`/`googlemail.com` → `https://mail.google.com/`, `outlook.com`/`hotmail.com`/`live.com` → `https://outlook.live.com/mail/`, `icloud.com`/`me.com` → `https://www.icloud.com/mail/`; any other domain tries Gmail (Google Workspace), then asks. Open it in a new tab of the same browser session (one profile; `browsing.md`'s one-session rule). A login page there means not signed in: close the tab, ask in chat. Otherwise search for the site's sender from the last 15 minutes (Gmail: `#search/from:<site domain> newer_than:1h`), open the newest, read the code from its text, close the tab, return to the login tab. No screenshot while the inbox is open, which overrides the "picture of each new page" rule for that tab. Wait up to about a minute for a late email before asking in chat.
- **The chat ask.** One line naming site and destination: *Netflix sent a code to your phone ending 1234. What is it?* The agent enters the reply with `agent-browser fill` and submits. The code appears in the stored chat and one command line; acceptable because it expires in minutes, unlike a password. If the reply is a backup code (the person says so, or it's longer than 10 characters with dashes), the agent doesn't use it and offers the hand-over.
- **App approval.** *Tap Yes in the Google app on your phone.* Then poll the address with `agent-browser get url` until it leaves the approval page, up to the site's own timeout (about 2 minutes), then say it timed out and offer to try again.
- **Wrong or expired code.** Say so, click the site's *Resend* when present, ask again; after three failures, offer the hand-over.
- **Codes inside a hand-over stay there.** When the person is already in the live browser link (single sign-on, say), the link stays open through the code page, as `browsing.md` already says.

## Risks / Trade-offs

- **The code sits in the stored chat.** A one-time code is dead in minutes; backup codes are excluded for this reason.
- **Reading the inbox is broader access than a code needs.** Limited to one search and the newest message, no pictures, and a line in the chat each time; the person agreed on 2026-10-01.
- **A site may show a code page the agent misreads.** It falls back to asking in chat or the hand-over; nothing is guessed or submitted blind.
- **The username shows in the chat's link.** It is already known to the chat from `auth list`; no password is ever in the link.
- **The person's password manager won't auto-match the page**, which sits on a tunnel address, not the site; the page's existing hint already says to pick the login from the manager's list.
- **PR #233 overlap.** Its "log in with a code" practice errand expects a hand-over; whichever publishes second updates it. Recorded as a memory thread at save time.

<!-- end design.md -->
<!-- file tasks.md utf8 1770 -->
# Tasks

## 1. Password link pre-fill

- [x] 1.1 `hand-over.mjs`: accept `--site` and `--username` with `open --passwords` only (usage error otherwise), and print them URL-encoded in the link's fragment beside the key; update the usage text and header comment
- [x] 1.2 `passwords-page.mjs` / `passwords-page.html`: read `site` and `user` from the fragment, pre-fill the add-a-login form, title the page *Save your <host> login*, focus the first empty field; no change without them
- [x] 1.3 Tests: `hand-over.test.mjs` covers the flags, the usage errors, and the fragment; `passwords-page.test.mjs` covers the pre-fill, the title, the focus, a pre-filled form saved by *Save and continue*, and that the server never receives the fragment

## 2. Wiki

- [x] 2.1 Write `wiki/development/login-codes.md`: when a code step after a saved login happens, emailed codes read from the signed-in inbox, codes asked in the chat, app approvals, wrong or expired codes, and what still goes to the hand-over, per `design.md`; links up to `browsing.md` and sideways to `passwords.md`
- [x] 2.2 `wiki/development/browsing.md`: step 2 sends no match or a rejected login to the pre-filled password link and a code page to the new page; drop "a login" and "a code sent to you" from the hand-over *When* list, keeping single sign-on and other on-page-only steps
- [x] 2.3 `wiki/development/passwords.md`: the agent also offers the link, site filled in, at a login with no saved or a rejected password; document `--site` and `--username`
- [x] 2.4 List the new page under Browsing in `wiki/development/README.md`

## 3. Release

- [x] 3.1 Add a `## Next (minor) — Log in with fewer taps` entry at the top of `CHANGELOG.md`
- [x] 3.2 Pass the payload and wiki checks in CI through `/save`

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 5381 -->
## MODIFIED Requirements

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs input only the person can give on the page (a captcha or picture puzzle, a passkey or device check, a single sign-on or other login with no password to save, a backup or recovery code, or any other such input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself, except that a password login with no saved or a rejected saved password SHALL follow the pre-filled password link requirement below, a one-time login code SHALL follow the login-code requirement below, API key or token website steps SHALL follow the own-browser requirement above, and a bot check or block that stops the agent's own browser SHALL first move the site to the cloud browser. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready, opens no link (the password link or a hand-over) until they reply, and the link's 10 minutes start from that reply

#### Scenario: A Cloudflare check in the agent's own browser

- **WHEN** a site shows a Cloudflare "Verify you are human" check in the agent's own browser
- **THEN** the agent moves the site to the cloud browser instead of sending a hand-over link

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When the site then asks for a one-time code or an app approval, the agent SHALL follow the login-code requirement. When the saved login is rejected, the agent SHALL send the password link with the site and that username filled in, so a new password replaces the old. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, with no hand-over

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and sends the password link with the site and username filled in, not a hand-over

## ADDED Requirements

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in, not a hand-over. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box, fills only the username and password, and the agent logs in with them

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form
- **THEN** the agent hands the browser over instead of sending the password link

### Requirement: The agent gets a login code without a hand-over

When a login the agent submitted reaches a one-time code step, the agent SHALL get the code without a hand-over link: from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent. It SHALL enter the code itself. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT log in to email to fetch a code, and SHALL NOT ask for a backup or recovery code in the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link. A code the person types during a hand-over stays in the hand-over.

#### Scenario: A code sent by text

- **WHEN** the agent logs in with a saved password and the site texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no hand-over link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is logged out of that email
- **THEN** the agent asks for the code in the chat and does not try to log in to the email

<!-- end specs/browser-logins/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41578 fence=~~~ -->
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
<title>Review · 2026-10-01-login-codes-in-chat</title>
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
<body data-change="2026-10-01-login-codes-in-chat">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-login-codes-in-chat</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When the agent meets a login it has no password for, or a site sends a code, it sends you a link to its live browser. Then you have to find the boxes on a small screen and type. A login only needs your username and password. A code only needs six digits, and many codes come by email, which the agent can often read itself. We want you to type as little as possible, and get the live browser only for steps only you can do on the page.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>No saved password? You get the password page, with the website already filled in.</b> It's the same page you use to save logins from your password manager. The website box already says the site, so you only fill your username and password, or pick them from your password manager. You can still drop an export file there too. Tap <i>Save and continue</i>, and the agent logs in with it and carries on.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">│ Save your Netflix login      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│                              │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ Website                      │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ [ netflix.com              ] │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ Email or username            │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ [                          ] │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ Password                     │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ [                          ] │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│                              │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│ or drop your export file     │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│                              │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│ [ Save and continue ]        │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A saved password that stopped working gets the same page</b>, with the website and your username filled in. You type only the new password, and it replaces the old one.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A code sent by email, the agent fetches itself.</b> When its browser is already signed in to that email, it opens only the newest message from that site, takes the code, and tells you in one line: <i>Got Netflix's code from your email.</i> It shows no picture of your inbox. If it can't find the code, it asks you in the chat.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A code sent to your phone or app is asked in the chat.</b> The agent says which site and where the code went, and you type it in the chat. The agent puts it in and carries on. No link, no <i>ready?</i> question.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0"> login page</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">     │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">     ▼</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">saved password? ──no──▶ password page</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">     │ yes              (site filled in)</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">     ▼                        │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0"> agent logs in ◀──────────────┘</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">     │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">     ▼</span>
<span class="ln" data-note="item-4-line-10" tabindex="0"> code page?</span>
<span class="ln" data-note="item-4-line-11" tabindex="0"> ┌───┴──────────┐</span>
<span class="ln" data-note="item-4-line-12" tabindex="0"> ▼              ▼</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">email        text / app</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">agent reads  you type it</span>
<span class="ln" data-note="item-4-line-15" tabindex="0">it           in the chat</span>
<span class="ln" data-note="item-4-line-16" tabindex="0"> └───┬──────────┘</span>
<span class="ln" data-note="item-4-line-17" tabindex="0">     ▼</span>
<span class="ln" data-note="item-4-line-18" tabindex="0"> logged in</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>&quot;Approve on your phone&quot; prompts need no link.</b> The agent tells you to tap <i>Yes</i> in the site's app and waits until the site lets it in.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A wrong or expired code is asked again in the chat.</b> The agent says so, asks the site for a new code when it offers one, and asks you again.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The live browser link is kept for what only you can do on the page:</b> picture puzzles, passkeys and Face ID, <i>Sign in with Google</i> or <i>Apple</i> buttons, backup or recovery codes, and sites that log in another way. If you're already in the browser link when the code arrives, you type it there, as now.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Nothing else changes.</b> Passwords still never go in the chat. Every action that pays, sends, or publishes still asks you in the chat first.</div></div></li>
</ol>
<p class="aside">Non-goals: the agent storing your authenticator app's codes; logging in to your email just to fetch a code; changing how payment pages are handed over; solving any picture puzzle or check.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether to share passwords through a 1Password link or an export, and to handle codes in the chat → chose: keep the existing export link for passwords; take codes in the chat; minimize what the person types, and hand over only picture puzzles, passkeys, and similar steps.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how to handle open PR #233, which edits the same hand-over rules → chose to keep going here; whichever publishes second catches up.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether the agent may open the person's signed-in inbox to read an emailed code → chose yes: only the newest message from that site, no picture, one line in the chat saying it did.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: backup and recovery codes still go through the browser link, because they don't expire and would sit in the stored chat.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the agent never logs in to email just to fetch a code, because that login may need its own code and loop.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: no storing of authenticator-app secrets, because agent-browser's login store holds only a username and password, and keeping both factors on one computer undoes the second factor.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the payment-page rule from 2026-09-28 (the person types their email and ticks the terms in the hand-over) stays, because this change covers logins only; it can widen later.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the rules live on a new wiki page linked from the browsing page, because the browsing page is near the 3,000-word limit and the open PR #233 adds to it.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked (as a note after review) that a login with no saved password send the person to the password page with the website filled in, like the export page, not the live browser → added it, plus the same page with site and username filled in for a rejected saved password.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the site and username travel in the link's <code>#</code> part beside the key, because that part never reaches the server or a log, and the username is already known to the chat from the saved-login list.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: <i>Sign in with Google</i> or <i>Apple</i> and other non-password logins keep the live browser link, because there's no password to save.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: built tasks 1.1–3.1 and added the new page to <code>payload-files.json</code> so the payload link check counts it; task 3.2 waits on CI at this save.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: task 3.2 done, because CI passed on PR #237; every task is complete.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked, after seeing screenshots, to put the login form above the export box when a site is filled in → done; the export box below reads <i>Or drop your password export here</i>.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: archived and numbered 29.7.0 for publishing, because every task is done and CI passed.</li>
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
