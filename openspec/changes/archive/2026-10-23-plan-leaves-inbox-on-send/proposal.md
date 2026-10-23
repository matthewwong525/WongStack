# A plan leaves the inbox once you send notes

**Status:** ready-to-ship
**Branch:** plan-leaves-inbox
**Open questions:** none

## Why

When you send notes on a plan in the inbox, or tap *Build it*, the plan stays under *Needs you* as if it still waited on you. Matthew saw it in ClaymooApp on 2026-10-23. Your computer closes a question or an approval once its answer reaches the chat, but it keeps a plan open on purpose, so the plan keeps asking for a review you already gave.

## What Changes

- **A plan leaves once the chat has your answer.** Send notes, *Build it*, or *Build and publish*, and the plan leaves the inbox as soon as the chat gets it, the way an answered question does. Until then it stays, showing *Waiting…* with *Cancel*, as now. A send that doesn't arrive keeps the plan, so you can try again.
  ```mermaid
  flowchart TD
    send[You send notes] --> got{Chat got it?}
    got -->|yes| gone[Plan leaves]
    got -->|no| stay[Plan stays]
    gone --> back[Updated plan comes back]
  ```
- **The updated plan comes back.** When the chat has made your changes and rebuilt the plan, the new version shows up under *Needs you* again, at a new link the chat gives you. You only see a plan when there is something new to look at.
- **The fix takes over at once.** The next plan opened on your computer replaces its inbox helper from older code, so you don't wait a day for it.
- **The reply-links page says so.** [Reply links](../../../wiki/development/reply-links.md) says a plan leaves once the chat has your answer and comes back when it's updated.

Non-goals: no change to the inbox's screens, its groups, or how a tap is sent. No change to a plan opened at a tunnel link outside the inbox: that page stays open until it runs out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `inbox`: a plan item closes once a tap on it reaches its chat, like an approval or question; an updated plan comes back as a new item.
- `reply-links`: a rebuilt page replaces its inbox copy at the same address only while that item is open; once closed, a reopened link opens a new item.

## Impact

- `.agents/skills/hand-over/scripts/reply-link.mjs`: `inboxTick` ends every item, plans included, once a tap on it is `sent`; `PROTOCOL` 4 → 5 so a running inbox helper from older code is swapped on the next open.
- Tests: `scripts/tests/reply-link-inbox.test.mjs` (a plan closes on a sent tap, stays on a failed one, and a rebuilt plan opened again gets a new item); any test that relied on a plan staying open after a send.
- Wiki: `wiki/development/reply-links.md`, the *In your inbox first* section.
- `CHANGELOG.md`: a patch entry, no hand step. Installed repos such as ClaymooApp get it on their next update.

## Decision log

- **2026-10-23** — Asked whether an updated plan should come back to the inbox after it leaves on a send → chose it comes back under *Needs you* once the chat has rebuilt it.
- **2026-10-23** — Assumed: *Build it* and *Build and publish* close the plan too, not only notes, because each one is the person's answer to the review and nothing is left to do on that version.
- **2026-10-23** — Assumed: the plan closes only once the chat has the tap, not when it's tapped, because a send that doesn't arrive must stay so the person can try again, as the inbox already does for approvals.
- **2026-10-23** — Assumed: the fix lives on the computer that delivers taps, not in the inbox's screen, because the computer already closes answered approvals there; a screen-only hide would leave the item open in the app and back after a reload.
- **2026-10-23** — Assumed: `PROTOCOL` goes to 5, because an inbox helper already running would keep plans open for up to a day; Matthew wants a fix to be whole.
- **2026-10-23** — Assumed: a patch release, because it fixes a bug and adds nothing new to do.
- **2026-10-23** — Assumed, after the second look: keep the rule that an action already sent on a version never wakes the chat twice, and test it, because it still guards against a double build when the helper stops after waking the chat but before reporting.
- **2026-10-23** — Archive checkpoint: every task built and ticked; the second look's two findings fixed (the wiki's same-link line, a test for the no-second-wake rule); numbered 44.9.3.
