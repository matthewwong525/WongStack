<!-- openspec-archive v1 2026-10-05-secure-form-replaces-hand-over -->
<!-- file proposal.md utf8 16548 -->
# Private forms replace the live browser link

**Status:** ready-to-ship
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
- **A step nothing can type ends with you.** For a picture puzzle or a passkey, the assistant first tries Cloudflare's browser where the site is only checking the browser. Otherwise it stops and gives you clear numbered steps, each with a direct link, to finish on your own phone. *Let me take over* no longer opens anything.
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
- **2026-10-05** — Asked whether to publish → answered: *if it can't log in, we should give them clear step-by-step instructions with links to make it easy for the user to do it themselves*. The browsing page gains *Steps for you to finish*, and every route that ends with the person links it.
- **2026-10-05** — Assumed: the steps cover the rest of the job, not only the login, because a login on the person's own phone does not log the assistant's browser in.
- **2026-10-05** — Archived all 16 completed tasks and kept the already-synced capability specs. Numbered the major release 34.0.0 from published 33.4.0; this checkpoint carries the archive, the release, and the *Steps for you to finish* rule through the automatic checks.

<!-- end proposal.md -->
<!-- file design.md utf8 9431 -->
# Design

## Context

See [proposal.md](proposal.md) for why. `.agents/skills/hand-over/scripts/hand-over.mjs` opens one private link at a time in three modes: `handOver` (the live view), `passwords`, and `keys`. All three share the key, the Cloudflare quick tunnel, the lock, the deadline, the detached watcher, `wait`, `close`, and the workspace wake-up. The live view owns most of the file: the page field scan, the autofill rules, the field, action, navigation and viewport routes, and the pass-through to agent-browser's live feed, plus `hand-over-page.html` and `hand-over-page.mjs`. `--local` skips the tunnel and prints a loopback link.

The live view types by focusing a field with an `agent-browser` command and sending the person's key presses over agent-browser's local live feed (`input_keyboard` messages), so no value is ever a command argument. That feed is the one part of the live view this design keeps, used from the watcher instead of the person's browser.

## Goals / Non-Goals

**Goals:**

- Remove the `handOver` mode, its page, and `--local`, leaving nothing that streams or steers the agent's browser from a link.
- Add a third mode, the private form, shaped like the key page.
- Keep the shared link machinery, its output lines, and the password and key pages unchanged.

**Non-Goals:**

- Renaming the skill, the script, or the `HANDOVER_*` output lines.
- Scanning the page from the script. The agent names the boxes.
- Any change to the cloud browser switch, saved logins, or login codes beyond wording.

## Decisions

### The agent names the boxes; the script scans nothing

`open --form <file> --until <glob>` or `--until-gone <selector>` opens the form. The file sits outside the repo, as a key link's guide does:

```json
{ "title": "Pay City of Markham",
  "note": "$45.00 · ticket P0178390",
  "fields": [
    { "label": "Card number", "kind": "cc-number", "target": "@e12" },
    { "label": "Expiry month", "kind": "cc-exp-month", "target": "@e13",
      "options": [{ "value": "03", "text": "03 - March" }] },
    { "label": "Security code", "kind": "cc-csc", "target": "@e15" }
  ],
  "submit": { "label": "Pay $45.00", "target": "@e31" } }
```

The agent reads labels, dropdown choices, and targets from its own snapshot, which it may already see; none is a value the person types. `form.mjs` owns the limits, as `keys.mjs` does for a guide: at most 12 fields, short plain-text labels, `kind` from the existing autofill token list, a target that is a snapshot ref or a selector, and a required `submit`. A finish is required, because the form must tell *sent* from *not accepted*.

Over reusing the live view's page scan: the scan runs in the main frame only, so a payment provider's embedded card box was reachable only by tapping the picture. A snapshot ref reaches into an embedded frame, and with no scan the script reads nothing from the page at all.

### Values travel over the browser's local input feed, never a command line

On the person's send, the watcher works through the fields in order. For a text box it runs `agent-browser focus <target>`, clears it, and types the value over agent-browser's local live feed as key presses, the transport the live view used. A dropdown pick runs `agent-browser select <target> <value>`: a pick is one of the choices the agent supplied, as today. Then it runs `agent-browser click <submit target>` once.

Rejected: `agent-browser fill <target> <value>` puts a card number in the process list, where the agent could read it. Rejected: setting `.value` through `eval`, which can't reach a cross-origin frame and which many sites' scripts ignore.

### One send, then the finish decides the outcome

After the click the watcher polls the finish, as it does now, for up to 60 seconds.

- **Reached:** result `done`. The link closes and the chat wakes, as for a saved password.
- **Not reached:** the watcher empties each text box it filled, by target, and puts each dropdown back to the choice it read before the pick, then reports `not-accepted`. The page says *Not accepted. Back to your chat.* The agent then looks at the page, reads the site's message, tells the person, and offers a new form.

A second tap is refused once a send has started: an uncertain payment must never be repeated by the form. `HANDOVER_RESULT` gains `not-accepted`; it never announces readiness, like `timeout` and `closed`.

### The agent's hands-off rule moves to the wiki as two lines

While `wait` runs, the agent sends its browser nothing. After `not-accepted` it may look, because the boxes are empty; after `done` the page has moved on. The script can't enforce this, so `browsing.md` states it and the spec promises it.

### Every link waits for its public address

`--local` and the loopback link go. After the tunnel's address appears in its log, `open` requests that address until it answers, within the existing tunnel wait, and only then prints `HANDOVER_LINK`. A link that never answers fails as a tunnel that never started does.

Tests keep their fake `cloudflared` and reach the page on the loopback port the watcher records in its 0600 state file. The public-address check gets the same kind of test seam the poll interval has, so no test needs the network.

### What is deleted

`hand-over-page.html`, `hand-over-page.mjs`, `hand-over-page.test.mjs`; in `hand-over.mjs` the field scan and autofill rules (the token list moves to `form.mjs`), the field, action, navigation and viewport routes, the stream pass-through, the blank-tab clean-up, the viewport reset, and `--local`. `open` with no mode flag becomes a usage error. `scripts/retired-names.json` gains the deleted file names and the removed wiki anchor.

### The wiki's shape

`browsing.md` loses *Hand the browser over* and gains two sections: *When a step needs you*, a short list routing each kind of step to its page, and *Private links*, which owns what the three links share: the *Ready?* question, how a link closes, the wake-up, the tunnel tool, and the safety paragraph. The private form's own procedure sits under *Private links*. `passwords.md` and `secrets.md` link *Private links* where they linked the hand-over. `secrets.md` is counted in a save route's size total, so its edits must not grow it.

### Release

A `major` entry: a way of working and a command option are removed. Its **Updating.** note says, in plain words, that a page of the install's own that links *Hand the browser over* should link *When a step needs you*, and that the computer needs Cloudflare's tunnel tool before its next password or key page.

## UX

### Use-case brief

A business owner on a phone, mid-task in the chat, at the moment a site needs their card or a backup code. The job: hand over those few values so the task finishes. Done: the site accepted them and the chat carries on by itself. Common case: a card, three or four boxes, filled by the phone's autofill, once per payment. Edge cases: one box for a backup code; a rejected card; a link that timed out. Assumed frequency: a few times a month per person. The closest existing screen is the key page; this mirrors it.

### Flow

Reply *Ready* in the chat → tap the link → autofill or type → tap the button named for the site's action → *Sent* → the chat carries on. A rejected card ends on *Not accepted* and continues in the chat.

### Hierarchy

The button named for the site's action is the one filled button. The title says who is paid or what is asked; the note under it is muted. *Close without sending* and the time left are muted text. No picture of the site and no second step.

### Review

[review.html](review.html). What Changes items 2 and 3 sketch the form and its two end states.

### Components

The key page's own styles and elements: `h1`, `.hint`, `.row`, `button.main`. New: a native `select` for a dropdown, and two boxes side by side for an expiry month and year. No library.

## Risks / Trade-offs

- [An embedded card box may not take focus or key presses through a ref] → Checked first against a test page with a cross-origin frame, before the rest is built. If it can't work, such a site ends with the site's link and steps, and the wiki says so.
- [A snapshot ref goes stale if the page redraws between the snapshot and the send] → A fill that fails ends as `not-accepted` after clearing what was typed; nothing is clicked.
- [A slow site passes the 60-second wait after a real payment] → `not-accepted` never claims the payment failed: the agent reads the page before it says anything, and a new form is only offered, never sent unasked.
- [Google may refuse the agent's browser at sign-in] → The blocked-site route applies, then the site's link and steps. Left as an open thread; it needs a real account.
- [The cloud browser's session may not accept the local input feed] → Checked in the same early test where a cloud key exists; otherwise recorded as an open thread and the wiki names the limit.
- [Pull request #233 builds on the removed code] → Named in the proposal; it is reworked there, not here.
- [An install's own wiki page links the removed heading and fails its link check after an update] → The release note gives the one-line fix.

## Migration Plan

Ships as one release. An open private link from the old version finishes or times out by itself; the release note asks installs to let it. Rolling back is reverting the release: nothing is stored in a new format.

<!-- end design.md -->
<!-- file tasks.md utf8 4981 -->
# Tasks

## 1. Prove the typing route

- [x] 1.1 With a throwaway local page holding a text box inside a cross-origin frame, confirm a snapshot ref can be focused and typed into over agent-browser's local input feed from a Node script, using a named session and never `close --all`; record the result in the Decision log, and stop to re-plan if it fails for same-origin fields too

## 2. The private form (script and page)

- [x] 2.1 Add `.agents/skills/hand-over/scripts/form.mjs`: validate the form file by the limits in design.md, serve the form's routes, and on send fill each field, press the submit target once, and refuse a second send; add `scripts/tests/form.test.mjs` covering a valid file, each rejected shape, the order of browser calls, no value in any recorded command, and the refused second send
- [x] 2.2 Add `form-page.html` and `form-page.mjs`, mirroring the key page: title, note, one labelled box per field with its autofill kind, a dropdown with the given choices, the named button, *Close without sending*, time left, and the *Sent* and *Not accepted* end states; add `scripts/tests/form-page.test.mjs` covering each state at phone width
- [x] 2.3 In `hand-over.mjs`, add `open --form <file>` requiring `--until` or `--until-gone`; after the send, wait up to 60 seconds for the finish, clear the filled text boxes when it is not reached, and report `HANDOVER_RESULT=not-accepted` with no readiness notification; extend `scripts/tests/hand-over.test.mjs` for both outcomes, the clearing calls, and the usage errors

## 3. Remove the live browser link and the local link

- [x] 3.1 Delete `hand-over-page.html`, `hand-over-page.mjs`, and `scripts/tests/hand-over-page.test.mjs`; remove from `hand-over.mjs` the `handOver` mode, field scan, autofill rules, field, action, navigation and viewport routes, stream pass-through, blank-tab clean-up, and viewport reset; make `open` with no mode a usage error; delete the tests that covered them and verify `node --test scripts/tests/hand-over.test.mjs` names no removed route
- [x] 3.2 Remove `--local`; print `HANDOVER_LINK` only once the tunnel's public address answers, failing as a tunnel that never started does; move `keys.test.mjs`, `passwords.test.mjs`, and `hand-over.test.mjs` off `--local` onto the fake tunnel tool and the recorded loopback port, and add tests for the wait and its failure
- [x] 3.3 Add the deleted file names and the `hand-the-browser-over` anchor to `scripts/retired-names.json` with their replacements, and update the script's header comment and usage text to the three remaining modes

## 4. Wiki and rules

- [x] 4.1 Rewrite `wiki/development/browsing.md`: replace *Hand the browser over* with *When a step needs you* and *Private links* (the form's procedure, the *Ready?* question, closing, wake-up, safety), fix saved-login step 3 for provider sign-in, and the pictures bullet; verify the page stays under 3,000 words
- [x] 4.2 Update `passwords.md`, `secrets.md` (no net growth), `login-codes.md` (backup code to the private form, emailed sign-in link, the *What still goes to the hand-over* section), `blocked-sites.md` (step 4 and the refusal wording), `required-tools.md` (every private link needs the tunnel tool), `kept-checks.md`, `repository-improvement.md`, and `wiki/development/README.md` to the new routes and anchors
- [x] 4.3 Update the browsing rule in `AGENTS.md` and the payment note on `wiki/people/matthew-wong.md`: his email and the terms are asked in the chat, the card goes in the private form
- [x] 4.4 Update `.agents/skills/hand-over/SKILL.md`, the hand-over line in `.agents/skills/close/SKILL.md`, `.agents/skills/verify/references/walkthrough.md`, the `browser` area's definition in `.agents/skills/memory/references/areas.json`, and the message in `scripts/employee-bootstrap.mjs`, with no net growth in skill text
- [x] 4.5 Add *Steps for you to finish* to `wiki/development/browsing.md` and link it from every route that ends with the person in `browsing.md`, `blocked-sites.md`, and `login-codes.md`; verify the wiki link check passes and the page stays under 3,000 words

## 5. Release

- [x] 5.1 Add the `## Next (major)` entry to `CHANGELOG.md` with the **Updating.** note from design.md, leaving `VERSION` alone

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate "secure-form-replaces-hand-over" --strict --no-interactive`; fix what this change broke
- [x] 6.2 Run `/save`, then open a real private form through Cloudflare against the throwaway page at phone width: fill it, send it, and show the person pictures of the form, *Sent*, and *Not accepted*; confirm no value appears in the watcher's files, the tunnel log, or the process list during the send
- [x] 6.3 Open a real password link and key link through Cloudflare from this computer and confirm each opens on the first tap and saves; record what could not be checked (Google sign-in, the cloud browser's input feed) as open threads

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 20089 -->
## ADDED Requirements

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A step only the person can do on the page (a picture puzzle, a passkey or device check) SHALL NOT be attempted by the agent: where a bot check stops its own browser the site SHALL first move to the cloud browser, and otherwise the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. The agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle that the cloud browser does not clear
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: The person gives sensitive details through a private form

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once. The form SHALL never show the site's page. When the site does not move on, the form SHALL say so, SHALL NOT send again by itself, and the agent SHALL tell the person what the site said and offer a new form.

#### Scenario: A card from a phone

- **WHEN** the person fills the card number, picks 03 and 2028 for the expiry, types the security code, and taps the form's *Pay $45.00* button on a phone
- **THEN** the site's card fields receive those values, the site's pay action is pressed once, and the chat carries on with a picture of the receipt

#### Scenario: The site rejects the card

- **WHEN** the site keeps the card page and shows an error after the form sends
- **THEN** the form says the details were not accepted, nothing is sent a second time, and the agent tells the person what the site said and offers a new form

### Requirement: The agent never sees what a private form carries

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back or stored. A dropdown pick SHALL be one of the choices the agent named. While a private form is open, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer; when the site keeps the page, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks. The agent SHALL learn only the outcome.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form
- **THEN** the number reaches the site's card field, and appears in no command, file, log, or message the agent can read

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

### Requirement: Every private link goes through Cloudflare and closes itself

A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass on a private form without a send or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: The agent pictures its browsing in the chat

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, and take none while a private form is open.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A card form mid-task

- **WHEN** a private form is open for a payment's card details
- **THEN** no picture appears until the site has answered

### Requirement: The agent gets a login code through the chat or email

When a login the agent submitted reaches a one-time code step, the agent SHALL get the code from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent, and SHALL enter the code itself. An emailed sign-in link SHALL be handled the same way. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT log in to email to fetch a code. A backup or recovery code SHALL go through the private form, never the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link.

#### Scenario: A code sent by text

- **WHEN** the agent logs in with a saved password and the site texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is logged out of that email
- **THEN** the agent asks for the code in the chat and does not try to log in to the email

## MODIFIED Requirements

### Requirement: The person does each login once

The agent SHALL log in with a login the person saved, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password anywhere but the browser tool's encrypted login store, which only the person fills through the password link.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. The person's own tap on a private form's button, which names the action, SHALL count as that yes for that action alone.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with every private link's safety: a new address and secret key each time, ending private input on successful completion, explicit closure, or after 10 minutes. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list. Its primary completion action SHALL save the selected pending logins, including a valid filled login not yet added to the list, and return to the requesting task in one tap. Failed saves SHALL stay open for correction and SHALL NOT announce readiness. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps its save-and-continue action
- **THEN** that login is saved and the requesting chat is notified, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps its save-and-continue action once
- **THEN** both logins are saved, and the agent names both sites in the chat

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When the site then asks for a one-time code or an app approval, the agent SHALL follow the login-code requirement. When the saved login is rejected, the agent SHALL send the password link with the site and that username filled in, so a new password replaces the old. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, asking the person nothing

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and sends the password link with the site and username filled in

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use browser automation, saved logins, screenshots, page extraction, or a private form for that token step. A newly supplied or replacement value SHALL use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

### Requirement: A site that blocks the agent's browser moves to the cloud browser

When a site shows a bot check the agent's own browser can't pass, or refuses it, the agent SHALL carry on in Cloudflare's cloud browser, saying so in one line in the chat, without retrying in its own browser. When the cloud browser is refused too, the agent SHALL stop browsing that site and give the person its link and the steps to do on their own device. Saved logins and private forms SHALL work in whichever browser the task uses.

#### Scenario: An order page behind a check

- **WHEN** the agent's own browser stays on a "Verify you are human" page for a restaurant's Uber Eats store
- **THEN** the chat says the site blocked the agent's browser, and the store's menu opens in the cloud browser with no tap from the person

#### Scenario: Both browsers are refused

- **WHEN** a DoorDash store refuses both browsers
- **THEN** the agent sends no private link and gives the store's link and the steps for the person's phone

### Requirement: A site's login carries over between the browsers

Before a site moves to the cloud browser, the agent SHALL copy only that site's login from its own browser into the cloud browser, and after the task SHALL copy any refreshed login for that site back. It SHALL NOT copy another site's login, or any cookie a bot check issued, and SHALL keep no copy after the switch. When the copied login is rejected, the agent SHALL log in there as for any login: a saved login, the password link, or a code through the chat.

#### Scenario: An order from a logged-in account

- **WHEN** the person is logged in to Uber Eats in the agent's browser and the Uber Eats store moves to the cloud browser
- **THEN** the cloud browser opens the store logged in, and no other site's login and no check's pass cookie is in it

#### Scenario: A login tied to one device

- **WHEN** a site rejects the copied login and asks for a code
- **THEN** the agent asks for the code in the chat and enters it in the cloud browser

### Requirement: The agent never disguises its browser

The agent SHALL NOT hide that its browser is automated, change the browser's identity to pass a check, send its traffic through another person's or a hired network address, use a check-solving service, or move a check's pass from one browser to another. This SHALL hold even when the person asks.

#### Scenario: The person offers to tap the check

- **WHEN** the person asks the agent to turn off its automated flag so a check passes
- **THEN** the agent declines and offers the cloud browser or the step on the person's own device

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box, fills only the username and password, and the agent logs in with them

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form and no saved Google login matches
- **THEN** the agent opens Google's sign-in and sends the password link with Google's website filled in

## REMOVED Requirements

### Requirement: The agent hands the browser over when it needs the person

**Reason**: The live browser link is removed. Replaced by *A step that needs the person goes to the chat or a private form*; the ask-before-a-link promise stays in the password link and private form requirements.

**Migration**: Use the chat for ordinary answers, the private form for sensitive values, and the person's own device for a puzzle or passkey.

### Requirement: A hand-over link closes itself

**Reason**: No hand-over link exists. Replaced by *Every private link goes through Cloudflare and closes itself*.

**Migration**: None; the password link, key link, and private form close themselves.

### Requirement: The agent keeps its hands off during a hand-over

**Reason**: No hand-over exists. Replaced by *The agent never sees what a private form carries*.

**Migration**: None.

### Requirement: The agent shows its browsing in the chat

**Reason**: Its hand-over scenario no longer applies and a MODIFIED block can't drop it. Replaced by *The agent pictures its browsing in the chat*.

**Migration**: None.

### Requirement: The person can click and type in a handed-over browser

**Reason**: The live view of the agent's browser is removed.

**Migration**: Sensitive values go through the private form; other answers go through the chat.

### Requirement: The person can fill a handed-over form from a list of its fields

**Reason**: The live view's field list is removed. The private form keeps labelled boxes that autofill can fill.

**Migration**: Use the private form.

### Requirement: The person can submit from outside the website preview

**Reason**: No website preview exists. The private form's one button presses the site's action.

**Migration**: Use the private form.

### Requirement: The person can recover from browser navigation

**Reason**: The person no longer navigates the agent's browser.

**Migration**: None.

### Requirement: Page and fields have separate space

**Reason**: The hand-over page and its two views are removed.

**Migration**: None.

### Requirement: The handed-over page scrolls dependably

**Reason**: The live page preview is removed.

**Migration**: None.

### Requirement: A page field opens the phone keyboard

**Reason**: The live page preview is removed; the private form uses the phone's own form fields.

**Migration**: None.

### Requirement: Phone typing keeps room for the active field

**Reason**: The live page preview is removed; the private form is an ordinary page the phone scrolls itself.

**Migration**: None.

### Requirement: The agent gets a login code without a hand-over

**Reason**: Its name and text refer to the removed hand-over. Replaced by *The agent gets a login code through the chat or email*, which also sends a backup code to the private form and covers an emailed sign-in link.

**Migration**: None.

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1247 -->
## ADDED Requirements

### Requirement: A private link adds one tool

A private link (the password link, the key link, or a private form) SHALL be the one step that needs Cloudflare's tunnel tool, including at the computer the agent runs on. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a private link needs it. It SHALL add nothing to the repository.

#### Scenario: A first private link

- **WHEN** a task needs a password link on a machine where the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** a task needs its first private link on a computer readied by setup
- **THEN** the link opens with no install step and no question

## REMOVED Requirements

### Requirement: A remote hand-over adds one tool

**Reason**: The hand-over is removed, and every private link now goes through the tunnel, so a link at the agent's own computer needs the tool too. Replaced by *A private link adds one tool*.

**Migration**: A computer that only ever used a local link installs the tunnel tool, with the person's consent, at its next private link.

<!-- end specs/dependencies/spec.md -->
<!-- file specs/knowledge-center/spec.md utf8 1633 -->
## MODIFIED Requirements

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Saved browser logins` while another wiki page links `browsing.md#saved-browser-logins`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/repository-improvement/spec.md utf8 1016 -->
## MODIFIED Requirements

### Requirement: Outcome-led improvement

`/improve [focus]` SHALL seek one improvement that makes the project meaningfully more useful, reliable, or easier to maintain, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired outcome. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve make the key link easier to use`
- **THEN** the agent investigates and selects one supported improvement toward that outcome through the project's existing workflow

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and delivery proceed without a separate candidate approval round

<!-- end specs/repository-improvement/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 2797 -->
## MODIFIED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL send a private link in the same reply, without first asking whether the person is ready. The link SHALL have every private link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or at its time limit. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

### Requirement: The key link waits for the person

A key link SHALL stay open for 30 minutes from when it is sent, and its page SHALL show the time left. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a password link
- **THEN** the key link closes, the password link opens, and the first chat says its link closed and offers a new one

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/workspace-cleanup/spec.md utf8 1146 -->
## MODIFIED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

<!-- end specs/workspace-cleanup/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 52884 fence=~~~ -->
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
<title>Review · 2026-10-05-secure-form-replaces-hand-over</title>
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
<body data-change="2026-10-05-secure-form-replaces-hand-over">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-secure-form-replaces-hand-over</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When a website step needs you, the assistant sometimes sends a link that shows its browser live and has you drive it: watch a picture of the page, tap around, and type into it. That is slow and fiddly, most of all on a phone. A plain form you fill in and send is quicker, and most answers don't need a link at all: the assistant can ask in the chat.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The live browser link is gone.</b> The assistant no longer shows you its browser or lets you control it. Each kind of step now has one simpler route.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">step               │ before       │ after</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">───────────────────┼──────────────┼───────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">password           │ password page│ same</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">login code         │ chat         │ same</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">email, address,    │ live browser │ chat</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">a choice, terms    │              │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">card, backup code  │ live browser │ +private form</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">Sign in with Google│ live browser │ password page</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">puzzle, passkey    │ live browser │ your own phone</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">&quot;let me take over&quot; │ live browser │ gone</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A private form for sensitive details.</b> For card details, a backup code, or another lasting secret a site asks for, the assistant asks if you're ready, then sends a link to a plain form: one box per detail, labelled as on the site. A password manager or your phone can fill it in one tap. Your tap on the button sends the details to the site and presses the site's own button, such as <i>Pay</i>. That tap is your yes. The assistant never sees what you typed, and the form never shows the site.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ Pay City of Markham          │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ $45.00 · ticket P0178390     │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ Card number                  │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ [..........................] │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ Expiry month   Expiry year   │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ [ 03 ▾ ]       [ 2028 ▾ ]    │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│ Security code                │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ [.....]                      │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│                              │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ [ Pay $45.00 ]               │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ Close without sending        │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│ Closes in 9 min              │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The form tells you how it went, and never sends twice.</b> If the site moves on, the form says <i>Sent</i> and the chat carries on by itself. If the site keeps the page, say for a mistyped card, the form says so, clears what it typed, and the assistant tells you what the site said and offers a new form.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌────────────────┐  ┌────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Sent           │  │ Not accepted   │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│                │  │                │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Back to your   │  │ Back to your   │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ chat           │  │ chat           │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">└────────────────┘  └────────────────┘</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">  site moved on     site kept the page</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Everything else on a form is asked in the chat.</b> An email, a name, an address, a choice, or agreeing to terms: the assistant asks you, types the answers itself, and shows you a picture of the page before the card form. It never ticks <i>I agree</i> without your yes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">you                      assistant</span>
<span class="ln" data-note="item-4-line-2" tabindex="0"> │◀─ Email? Accept terms? ──│</span>
<span class="ln" data-note="item-4-line-3" tabindex="0"> │── answers ──────────────▶│ types them</span>
<span class="ln" data-note="item-4-line-4" tabindex="0"> │◀─ picture, &quot;Ready for    │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0"> │    the card form?&quot; ──────│</span>
<span class="ln" data-note="item-4-line-6" tabindex="0"> │── Ready ────────────────▶│</span>
<span class="ln" data-note="item-4-line-7" tabindex="0"> │◀─ private form link ─────│</span>
<span class="ln" data-note="item-4-line-8" tabindex="0"> │── card, tap Pay ────────▶│ site charges</span>
<span class="ln" data-note="item-4-line-9" tabindex="0"> │◀─ picture of the receipt │</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Sign in with Google or Apple uses a saved login.</b> The assistant opens the provider's own sign-in and logs in with the login you saved for it, or sends the password page for it. A code the provider sends comes through the chat, as today.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A step nothing can type ends with you.</b> For a picture puzzle or a passkey, the assistant first tries Cloudflare's browser where the site is only checking the browser. Otherwise it stops and gives you clear numbered steps, each with a direct link, to finish on your own phone. <i>Let me take over</i> no longer opens anything.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Every private link goes through Cloudflare.</b> The password page, the key page, and the new form always open at a Cloudflare address, with no separate link for when you sit at the assistant's computer. A computer needs Cloudflare's free tunnel tool before its first link; the assistant asks, then installs it. The link is also sent only once it works from outside, so a quick tap no longer lands on a Cloudflare error page.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>What stays the same.</b> The password page and the key page look and work as today. A link still gets a new secret address each time and closes itself. The assistant still asks before it publishes, sends, books, pays, or deletes.</div></div></li>
</ol>
<p class="aside">Non-goals: solving puzzles or passkeys for you; saving a card for next time; renaming the private-link tool or its files; changing the password page or the key page; the unpublished practice-errands work.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked (in the person's own message) to get rid of the browser the person controls with a picture preview, and keep only the page where they type and submit → this change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked what happens at a step that isn't a password or key, such as card details, a backup code, or an email and terms → answered: <i>it should ask in the chat for forms usually, form is only for sensitive info. Payments we do thru a secure form like what we have rn</i>.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether a link still goes through Cloudflare at the assistant's own computer → chose always Cloudflare.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how this fits with the unpublished practice-errands change (pull request #233) → chose keep going here; that change is reworked before it publishes.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the form's button presses the site's own button, and that tap is the person's yes, because the card would otherwise sit on the page where the assistant's next look could read it, and with the live browser the person tapped <i>Pay</i> themselves too.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: one send per form, and what the form typed is cleared when the site does not move on, because a repeated send could pay twice and a leftover card number could be seen.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the private form keeps the <i>Ready?</i> question and a 10-minute clock, like the password page, because it acts on a signed-in website.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <i>Sign in with Google</i> or <i>Apple</i> becomes a saved login for that provider, because a password page already covers any login with a password box. Not checked: whether Google accepts the assistant's browser; if it refuses, the blocked-site route applies.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a picture puzzle or passkey ends with the site's link and steps for the person's own device, because nothing typed into a form can pass them and the person ruled out the live view.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: an emailed sign-in link is handled like a login code, read from signed-in email or pasted in the chat, because it expires in minutes as a code does.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the link is sent only once its Cloudflare address answers, because every link now goes through Cloudflare and an early tap was known to show an error page.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the tool and its files keep the name <code>hand-over</code>, because renaming touches every install's commands for no change the person sees.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a major release, because a way of working and a command option are removed.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: task 1.1's typing check moves from before the build to the final checks, because the build brief finishes all source and tests before anything runs. Its duty stands: a failure for same-origin fields still stops for a re-plan.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a box's <code>kind</code> may be left out, because a backup code has no autofill name.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <code>open --form</code> refuses a finish the page already meets, because the form could not then tell <i>sent</i> from <i>not accepted</i>, and would say <i>Sent</i> for a payment nobody made.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a send under way outlasts <code>close</code> and the time limit, and a press whose command fails still waits for the finish, because stopping midway could leave a card typed on the page, and the site may have taken the press.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <i>Close without sending</i> reports <code>closed</code>, not <code>done</code>, because <code>done</code> now means the site accepted the details.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: <code>wiki/stack/company-api.md</code> and <code>wiki/stack/api-keys.md</code> are edited too, because both linked the removed heading. Company sign-in now says the employee finishes it in their own browser.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>scripts/tests/hand-over-page.test.mjs</code> is deleted with the live browser page it tested. Every test in it drove that page alone; none guarded a file that stays. <code>scripts/tests/form-page.test.mjs</code> covers the page that replaces it.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-05</p>Check: <code>scripts/tests/hand-over.test.mjs</code> loses the tests for the removed field scan, autofill rules, field, action, navigation and viewport routes, the live-feed pass-through, the blank-tab clean-up, and the local link. Its tests for the link, its lock, its time limit, the wake-up, and the key link's rules stay, now through the tunnel. <code>scripts/tests/form.test.mjs</code> and new tests in the same file cover the private form.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the browsing page's shared section is headed <i>How private links work</i>, not <i>Private links</i>, because the release check for removed names refuses any link ending in <code>#private</code>, a name retired earlier.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the message in <code>scripts/employee-bootstrap.mjs</code> is reworded as planned, though the file's bytes are pinned for employee setup in <code>app/worker/employee-access/bootstrap-release.json</code>. The pin needs a new commit and digest at the save, by the steps in <code>wiki/stack/employee-project.md</code>; until then the script test that compares them fails.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Checked (task 1.1): on a throwaway local page, with agent-browser 0.38.1 in a named session and a profile of its own, the form's send typed a name into a same-origin box and a card number into a box inside a cross-origin frame, each focused by its snapshot ref and typed over the local input feed from Node; it picked a dropdown and pressed the button. Three runs of three passed, with no typed value in any command. Not checked: the cloud browser's input feed, which needs a cloud session.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the message in <code>scripts/employee-bootstrap.mjs</code> goes back to its old wording, replacing the assumption above, because the file is pinned for employee setup and a one-line rewording is not worth a new pin. Its mention of a browser hand-over is left for the next time that script changes.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a refused form also puts each dropdown back to what the site showed, because a real try through Cloudflare left the picked expiry month on the page where the assistant could see it. The form reads a dropdown's own choice before the pick to do this, and nothing else from the page.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Checked (task 6.2, first part): a real private form through Cloudflare, opened at phone width about 8 seconds after it was asked for, typed a made-up card into a pretend checkout on this computer, a box inside a cross-origin frame included; the page reached its receipt, the form said <i>Sent</i>, and the chat was woken. A second form with a refused security code ended <i>Not accepted</i> with the card number and code emptied. No file and no running command held either number.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Checked (task 6.2, second part): after the dropdown fix, a refused form on the pretend checkout left the card number and security code empty and the expiry month back at the site's own blank choice. The pretend page and both test browsers were closed afterwards.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Checked (task 6.3): a real password link and a real key link, each through Cloudflare from this computer, opened on the first try at phone width and saved a made-up login and a made-up key, into a throwaway login store and a throwaway project; each woke this chat. Neither value was in any file the link wrote. Not checked: Google sign-in in the assistant's browser, and the cloud browser's input feed; both need a real account or a cloud session.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the wake-up notice cuts off a command the same chat is still running when a link finishes, because three test commands stopped at the moment their link completed and none stopped when a link ended without a wake-up. In real use the chat is only waiting, so nothing is lost; it mattered here only because the assistant played the person too.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Saved for the automatic checks with every task built and the six main specs brought in line with this change. The checks on this computer pass, the removed-names check included. Session facts are queued for the memory store, which did not answer.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether to publish → answered: <i>if it can't log in, we should give them clear step-by-step instructions with links to make it easy for the user to do it themselves</i>. The browsing page gains <i>Steps for you to finish</i>, and every route that ends with the person links it.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the steps cover the rest of the job, not only the login, because a login on the person's own phone does not log the assistant's browser in.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Archived all 16 completed tasks and kept the already-synced capability specs. Numbered the major release 34.0.0 from published 33.4.0; this checkpoint carries the archive, the release, and the <i>Steps for you to finish</i> rule through the automatic checks.</li>
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
