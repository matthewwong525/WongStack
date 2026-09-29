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
