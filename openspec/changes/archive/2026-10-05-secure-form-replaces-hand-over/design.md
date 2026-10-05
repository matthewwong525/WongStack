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
