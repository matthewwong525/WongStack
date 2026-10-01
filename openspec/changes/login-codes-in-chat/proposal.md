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
