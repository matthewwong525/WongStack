# Private forms replace the live browser link

**Status:** in-progress
**Branch:** drop-browser-login
**Open questions:** none

## Why

When a website step needs you, the assistant sometimes sends a link that shows its browser live and has you drive it: watch a picture of the page, tap around, and type into it. That is slow and fiddly, most of all on a phone. A plain form you fill in and send is quicker, and most answers don't need a link at all: the assistant can ask in the chat.

## What Changes

- **The live browser link is gone.** The assistant no longer shows you its browser or lets you control it. Each kind of step now has one simpler route.
  ```text
  step               │ before       │ after
  ───────────────────┼──────────────┼───────────────
  password           │ password page│ same
  login code         │ chat         │ same
  email, address,    │ live browser │ chat
  a choice, terms    │              │
  card, backup code  │ live browser │ +private form
  Sign in with Google│ live browser │ password page
  puzzle, passkey    │ live browser │ your own phone
  "let me take over" │ live browser │ gone
  ```
- **A private form for sensitive details.** For card details, a backup code, or another lasting secret a site asks for, the assistant asks if you're ready, then sends a link to a plain form: one box per detail, labelled as on the site. A password manager or your phone can fill it in one tap. Your tap on the button sends the details to the site and presses the site's own button, such as *Pay*. That tap is your yes. The assistant never sees what you typed, and the form never shows the site.
  ```text
  ┌──────────────────────────────┐
  │ Pay City of Markham          │
  │ $45.00 · ticket P0178390     │
  │                              │
  │ Card number                  │
  │ [..........................] │
  │ Expiry month   Expiry year   │
  │ [ 03 ▾ ]       [ 2028 ▾ ]    │
  │ Security code                │
  │ [.....]                      │
  │                              │
  │ [ Pay $45.00 ]               │
  │ Close without sending        │
  │ Closes in 9 min              │
  └──────────────────────────────┘
  ```
- **The form tells you how it went, and never sends twice.** If the site moves on, the form says *Sent* and the chat carries on by itself. If the site keeps the page, say for a mistyped card, the form says so, clears what it typed, and the assistant tells you what the site said and offers a new form.
  ```text
  ┌────────────────┐  ┌────────────────┐
  │ Sent           │  │ Not accepted   │
  │                │  │                │
  │ Back to your   │  │ Back to your   │
  │ chat           │  │ chat           │
  └────────────────┘  └────────────────┘
    site moved on     site kept the page
  ```
- **Everything else on a form is asked in the chat.** An email, a name, an address, a choice, or agreeing to terms: the assistant asks you, types the answers itself, and shows you a picture of the page before the card form. It never ticks *I agree* without your yes.
  ```text
  you                      assistant
   │◀─ Email? Accept terms? ──│
   │── answers ──────────────▶│ types them
   │◀─ picture, "Ready for    │
   │    the card form?" ──────│
   │── Ready ────────────────▶│
   │◀─ private form link ─────│
   │── card, tap Pay ────────▶│ site charges
   │◀─ picture of the receipt │
  ```
- **Sign in with Google or Apple uses a saved login.** The assistant opens the provider's own sign-in and logs in with the login you saved for it, or sends the password page for it. A code the provider sends comes through the chat, as today.
- **A step nothing can type ends with you.** For a picture puzzle or a passkey, the assistant first tries Cloudflare's browser where the site is only checking the browser. Otherwise it stops and gives you the site's link and the steps to do on your own phone. *Let me take over* no longer opens anything.
- **Every private link goes through Cloudflare.** The password page, the key page, and the new form always open at a Cloudflare address, with no separate link for when you sit at the assistant's computer. A computer needs Cloudflare's free tunnel tool before its first link; the assistant asks, then installs it. The link is also sent only once it works from outside, so a quick tap no longer lands on a Cloudflare error page.
- **What stays the same.** The password page and the key page look and work as today. A link still gets a new secret address each time and closes itself. The assistant still asks before it publishes, sends, books, pays, or deletes.

Non-goals: solving puzzles or passkeys for you; saving a card for next time; renaming the private-link tool or its files; changing the password page or the key page; the unpublished practice-errands work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the live hand-over and its eleven supporting requirements are removed; a step that needs the person goes to the chat or a private form; the private form's promises (what it carries, what the agent never sees, how it ends); every private link goes through Cloudflare; single sign-on follows the provider's login; a backup code goes to the private form.
- `dependencies`: Cloudflare's tunnel tool is needed by every private link, at the agent's own computer too.
- `secrets-convention`: the key link's safety wording and its give-way scenario no longer name a hand-over link.
- `workspace-cleanup`: `/close` closes a private link the chat left open.
- `knowledge-center`: the broken-section-link scenario uses a heading that still exists.
- `repository-improvement`: the desired-outcome scenario names the key link.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: the live-browser mode, its field scan, live-feed proxy, viewport and navigation routes, and `--local` go; `open --form <file>` arrives; the link prints once the public address answers.
- `.agents/skills/hand-over/scripts/hand-over-page.html` and `hand-over-page.mjs`: deleted. New `form.mjs`, `form-page.html`, `form-page.mjs` beside the key and password pages.
- `.agents/skills/hand-over/SKILL.md`, `.agents/skills/close/SKILL.md`, `.agents/skills/verify/references/walkthrough.md`, `.agents/skills/memory/references/areas.json`, `scripts/employee-bootstrap.mjs`: wording.
- `scripts/tests/hand-over.test.mjs` cut to what remains; `hand-over-page.test.mjs` deleted; new `form.test.mjs` and `form-page.test.mjs`; `keys.test.mjs` and `passwords.test.mjs` drop `--local`.
- `wiki/development/browsing.md`, `passwords.md`, `secrets.md`, `login-codes.md`, `blocked-sites.md`, `required-tools.md`, `kept-checks.md`, `repository-improvement.md`, `README.md`; `AGENTS.md`'s browsing rule; `wiki/people/matthew-wong.md`.
- Six specs via the deltas; `scripts/retired-names.json`; `CHANGELOG.md` *Next (major)* entry.
- Unpublished pull request #233 (practice errands) edits the same script and page and grades a browser link per payment; it must be reworked onto this before it publishes.
- No new dependency.

## Decision log

- **2026-10-05** — Asked (in the person's own message) to get rid of the browser the person controls with a picture preview, and keep only the page where they type and submit → this change.
- **2026-10-05** — Asked what happens at a step that isn't a password or key, such as card details, a backup code, or an email and terms → answered: *it should ask in the chat for forms usually, form is only for sensitive info. Payments we do thru a secure form like what we have rn*.
- **2026-10-05** — Asked whether a link still goes through Cloudflare at the assistant's own computer → chose always Cloudflare.
- **2026-10-05** — Asked how this fits with the unpublished practice-errands change (pull request #233) → chose keep going here; that change is reworked before it publishes.
- **2026-10-05** — Assumed: the form's button presses the site's own button, and that tap is the person's yes, because the card would otherwise sit on the page where the assistant's next look could read it, and with the live browser the person tapped *Pay* themselves too.
- **2026-10-05** — Assumed: one send per form, and what the form typed is cleared when the site does not move on, because a repeated send could pay twice and a leftover card number could be seen.
- **2026-10-05** — Assumed: the private form keeps the *Ready?* question and a 10-minute clock, like the password page, because it acts on a signed-in website.
- **2026-10-05** — Assumed: *Sign in with Google* or *Apple* becomes a saved login for that provider, because a password page already covers any login with a password box. Not checked: whether Google accepts the assistant's browser; if it refuses, the blocked-site route applies.
- **2026-10-05** — Assumed: a picture puzzle or passkey ends with the site's link and steps for the person's own device, because nothing typed into a form can pass them and the person ruled out the live view.
- **2026-10-05** — Assumed: an emailed sign-in link is handled like a login code, read from signed-in email or pasted in the chat, because it expires in minutes as a code does.
- **2026-10-05** — Assumed: the link is sent only once its Cloudflare address answers, because every link now goes through Cloudflare and an early tap was known to show an error page.
- **2026-10-05** — Assumed: the tool and its files keep the name `hand-over`, because renaming touches every install's commands for no change the person sees.
- **2026-10-05** — Assumed: a major release, because a way of working and a command option are removed.
- **2026-10-05** — Assumed: task 1.1's typing check moves from before the build to the final checks, because the build brief finishes all source and tests before anything runs. Its duty stands: a failure for same-origin fields still stops for a re-plan.
- **2026-10-05** — Assumed: a box's `kind` may be left out, because a backup code has no autofill name.
- **2026-10-05** — Assumed: `open --form` refuses a finish the page already meets, because the form could not then tell *sent* from *not accepted*, and would say *Sent* for a payment nobody made.
- **2026-10-05** — Assumed: a send under way outlasts `close` and the time limit, and a press whose command fails still waits for the finish, because stopping midway could leave a card typed on the page, and the site may have taken the press.
- **2026-10-05** — Assumed: *Close without sending* reports `closed`, not `done`, because `done` now means the site accepted the details.
- **2026-10-05** — Assumed: `wiki/stack/company-api.md` and `wiki/stack/api-keys.md` are edited too, because both linked the removed heading. Company sign-in now says the employee finishes it in their own browser.
- **2026-10-05** — Check: `scripts/tests/hand-over-page.test.mjs` is deleted with the live browser page it tested. Every test in it drove that page alone; none guarded a file that stays. `scripts/tests/form-page.test.mjs` covers the page that replaces it.
- **2026-10-05** — Check: `scripts/tests/hand-over.test.mjs` loses the tests for the removed field scan, autofill rules, field, action, navigation and viewport routes, the live-feed pass-through, the blank-tab clean-up, and the local link. Its tests for the link, its lock, its time limit, the wake-up, and the key link's rules stay, now through the tunnel. `scripts/tests/form.test.mjs` and new tests in the same file cover the private form.
- **2026-10-05** — Assumed: the browsing page's shared section is headed *How private links work*, not *Private links*, because the release check for removed names refuses any link ending in `#private`, a name retired earlier.
- **2026-10-05** — Assumed: the message in `scripts/employee-bootstrap.mjs` is reworded as planned, though the file's bytes are pinned for employee setup in `app/worker/employee-access/bootstrap-release.json`. The pin needs a new commit and digest at the save, by the steps in `wiki/stack/employee-project.md`; until then the script test that compares them fails.
- **2026-10-05** — Checked (task 1.1): on a throwaway local page, with agent-browser 0.38.1 in a named session and a profile of its own, the form's send typed a name into a same-origin box and a card number into a box inside a cross-origin frame, each focused by its snapshot ref and typed over the local input feed from Node; it picked a dropdown and pressed the button. Three runs of three passed, with no typed value in any command. Not checked: the cloud browser's input feed, which needs a cloud session.
- **2026-10-05** — Assumed: the message in `scripts/employee-bootstrap.mjs` goes back to its old wording, replacing the assumption above, because the file is pinned for employee setup and a one-line rewording is not worth a new pin. Its mention of a browser hand-over is left for the next time that script changes.
- **2026-10-05** — Assumed: a refused form also puts each dropdown back to what the site showed, because a real try through Cloudflare left the picked expiry month on the page where the assistant could see it. The form reads a dropdown's own choice before the pick to do this, and nothing else from the page.
- **2026-10-05** — Checked (task 6.2, first part): a real private form through Cloudflare, opened at phone width about 8 seconds after it was asked for, typed a made-up card into a pretend checkout on this computer, a box inside a cross-origin frame included; the page reached its receipt, the form said *Sent*, and the chat was woken. A second form with a refused security code ended *Not accepted* with the card number and code emptied. No file and no running command held either number.
- **2026-10-05** — Checked (task 6.2, second part): after the dropdown fix, a refused form on the pretend checkout left the card number and security code empty and the expiry month back at the site's own blank choice. The pretend page and both test browsers were closed afterwards.
- **2026-10-05** — Checked (task 6.3): a real password link and a real key link, each through Cloudflare from this computer, opened on the first try at phone width and saved a made-up login and a made-up key, into a throwaway login store and a throwaway project; each woke this chat. Neither value was in any file the link wrote. Not checked: Google sign-in in the assistant's browser, and the cloud browser's input feed; both need a real account or a cloud session.
- **2026-10-05** — Assumed: the wake-up notice cuts off a command the same chat is still running when a link finishes, because three test commands stopped at the moment their link completed and none stopped when a link ended without a wake-up. In real use the chat is only waiting, so nothing is lost; it mattered here only because the assistant played the person too.
- **2026-10-05** — Saved for the automatic checks with every task built and the six main specs brought in line with this change. The checks on this computer pass, the removed-names check included. Session facts are queued for the memory store, which did not answer.
