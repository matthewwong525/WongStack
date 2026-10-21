# Proposal

**Status:** ready-to-ship
**Branch:** fix-private-form-false-not-accepted
**Open questions:** none

## Why

On 2026-10-21 the private card form told Matthew *Not accepted: nothing is sent again* for a US$12.60 Pebble payment that the site took. The form gives a site 60 seconds after the press, then calls anything unfinished a refusal and empties the card boxes, even on a page that may still be paying. A person who believes it pays again and is charged twice. Sending also felt slow on both payments, and nothing records where the time goes.

## What Changes

- **The form waits honestly.** It now ends one of three ways:
  - **Sent:** the site moved on.
  - **Not accepted:** nothing was pressed, or the site kept the same page with the card boxes there for ten minutes.
  - **Still checking:** anything else, including a page the browser can no longer read. If the site hasn't confirmed after one minute, the phone and the chat both say so and not to pay again. The form keeps watching for ten more minutes, then the chat reports how it ended, *Sent* included.
  ```mermaid
  flowchart TD
    press[press Pay] --> min{"done in 1 min?"}
    min -->|yes| sent[Sent]
    min -->|no| still["Still checking"]
    still --> watch{"done in 10 min?"}
    watch -->|yes| late["chat: it went through"]
    watch -->|"page kept still"| no[Not accepted]
    watch -->|"page moved"| look["chat: not confirmed"]
  ```

- **The card boxes are emptied only when it's safe.** The form empties them only once the site has clearly kept its page. That means never while a payment may be under way, and never on a page that has moved on.

- **The phone says only what it knows.** *Not accepted* no longer says "nothing is sent again", which read as "you weren't charged". While it sends, the form shows each step: *Typing your details… Pressing Pay… Waiting for the site…*
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Sending</span>
      <h3>Pay Pebble tax and confirm</h3>
      <div class="bar"></div>
      <p class="muted">Waiting for the site…</p>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">Still checking</span>
      <h3>Sent, waiting for the site</h3>
      <p class="muted">Don't pay again. Your chat will say how it went.</p>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">Not accepted</span>
      <h3>Not accepted</h3>
      <p class="muted">The site kept its page. Back to your chat to see what it said.</p>
    </div>
  </div>
  ```

- **Sending is faster, and timed.**
  - The form checks four times as often for the site's answer.
  - Its one-minute clock starts when it presses Pay, not after the browser finishes the press.
  - Each send keeps a record of how long each step took and how each link ended, never what was typed.
  - We time a practice checkout and fix whatever the record shows is slow, in this change.

**Non-goals:** the browser's typing landing in a same-named box inside a payment frame, and a checkbox the browser's click doesn't tick. Both are planned in their own workspace, "Browser typing and checkbox glitches". Finding why one fresh link closed itself is out of scope too: the new record names what ended a link, so the next one shows the cause.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the private form's endings become sent, not accepted, and still checking, with a ten-minute background watch and a late result. Boxes are emptied only on a page that kept still. The phone shows send progress, and a timing record keeps no values.

## Impact

- `.agents/skills/hand-over/scripts/form.mjs` (`sendForm` outcomes, undo rule, step timings), `hand-over.mjs` (watch after the send, `wait` reporting `unconfirmed` then the final result, poll interval, timing log, ending causes), `form-page.mjs`/`form-page.html` (progress, new endings).
- Tests: `scripts/tests/form.test.mjs`, `form-page.test.mjs`, `hand-over.test.mjs`.
- Docs: `wiki/development/private-form.md`, `wiki/development/browsing.md` (what the helper reads), `.agents/skills/hand-over/SKILL.md` usage, `CHANGELOG.md`.

## Decision log

- **2026-10-21** — Asked what happens when the site hasn't confirmed within a minute → chose to tell the chat "still checking" and keep watching ten minutes, reporting a late *Sent*.
- **2026-10-21** — Asked whether to fold in the dead link, wrong-box typing, and checkbox issues → chose to fix the form here and plan the browser glitches in their own workspace.
- **2026-10-21** — Assumed: watch for ten minutes and check every half second, because both are cheap to change and cover a slow card network.
- **2026-10-21** — Assumed: a page the browser can't read counts as unknown, never as "not yet", because the browser closes a tab whose press runs past 30 seconds and the form then read it as a refusal.
- **2026-10-21** — Assumed: speed fixes found by the timing record land in this change, because Matthew wants a thing improved, not only measured.
- **2026-10-21** — Assumed: the phone's pressing step names the site's own button (*Pressing Pay $12.60…*) instead of a fixed *Pressing Pay…*, because the form already carries that label and it says exactly what is being pressed.
- **2026-10-21** — Archive checkpoint: built, second look found two fixes (a tunnel left running when the watch ended within 1.2 s, and a `close` during the send waiting out the whole watch), both fixed with tests; the live walk through real links passed all three endings; archived for ship as 43.18.0.
