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
