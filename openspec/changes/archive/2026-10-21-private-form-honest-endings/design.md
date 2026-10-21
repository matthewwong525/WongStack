# Design

## Context

See proposal.md for why. Today `sendForm` (`form.mjs`) fills each box, presses with `.catch(() => {})`, then `reachesFinish` (`hand-over.mjs`) polls `seen()` every `POLL_MS` (2 s) until `SEND_WAIT_MS` (60 s) runs out after the press returns. Anything short of the finish is `not-accepted`, and the undo list then types `''` into every box. `wait` prints one result; the phone shows *Not accepted: The site kept its page, and nothing is sent again.*

Evidence from the 2026-10-21 Pebble chat (transcript `greasy-dinosaur/21b55213`): the link opened at 02:19:04Z, the result was written at 02:22:19.9Z, and `browse.mjs get url` showed the summary page at 02:22:27Z. The `--until-gone 'iframe[name^="__privateStripeFrame"]'` count was 3 before the send and 0 only after a full reload. Any of three causes fits, and nothing recorded which:

1. **The site was slower than 60 s.**
2. **The browser closed the tab.** camofox's click holds the tab lock through Playwright's click, a 500 ms pause, and a post-click ref rebuild over every frame, up to `HANDLER_TIMEOUT_MS` (30 s). A handler past that runs `destroyTimedOutTab`. The watcher's client (`retry: false`) then reads `url` as null and `count` as NaN, and `finished()` treats that as "not yet".
3. **Stripe's hidden frames stayed.** After Next.js switched pages without a reload, they may have kept the count above 0.

Every `evaluate` also waits on the same tab lock, so polling cannot overlap the press.

## Goals / Non-Goals

**Goals:** never call an in-flight or moved payment refused; never empty boxes on a page that may be paying or has moved; let the chat hear early and again late; find and cut the send's slow steps with a values-free timing record.

**Non-Goals:** camofox's cross-frame ref collisions and React checkbox clicks (workspace "Browser typing and checkbox glitches"); changing camofox's own source; diagnosing the 2026-10-21 self-closing link beyond recording ending causes.

## Decisions

### Three outcomes from `sendForm`

`sendForm` returns one of:

| Outcome | When | Undo? |
|-|-|-|
| `done` | finish met | no |
| `not-accepted` | a box failed before the press (nothing pressed) | yes |
| `unconfirmed` | pressed, finish not met within `SEND_WAIT_MS` | no, not yet |

The `SEND_WAIT_MS` clock starts when the press is *sent*, not when camofox returns, so a 28 s click handler eats the first minute instead of adding to it. The press's error is still swallowed: a failed press may have gone through.

*Alternative considered:* keep two outcomes and stretch `SEND_WAIT_MS` to five minutes. Matthew chose the early "still checking" over a silent chat.

### The watch after `unconfirmed`

On `unconfirmed`, the watcher ends the link's input. The phone gets its receipt, and the tunnel and page server close as today. The watcher process then stays alive in a new phase, `watching`. State gains `watching: { until, sentUrl }`, and `result.json` gets `{ result: 'unconfirmed', watching: true, ... }`. The chat is notified with that result.

Every `WATCH_POLL_MS` (2 s) for `WATCH_MS` (10 min), it reads `seen()`:

- **Finish met:** final result `done`, a late notification.
- **The read failed** (url null or count NaN) **or the address differs from `sentUrl`:** marked `moved`, and that never clears.
- **At `WATCH_MS`:** if never `moved`, and `url === sentUrl`, and an `--until-gone` count still equals its count at the press, run the undo list and end `not-accepted`. Otherwise end `unconfirmed` with `watching: false`. The page kept still for ten minutes, so the site isn't mid-payment.

The page stays open during the watch: each read is an `evaluate`, the same call the keep-alive makes, so camofox counts every read as use. `close` during the watch ends it early by the same end-of-watch rule, so a person who saw a decline text doesn't wait ten minutes.

*Why not undo when the page moved:* a ref on a new page can resolve to a different box; typing `''` there is a blind write.

### `wait` reports twice

`wait` prints `HANDOVER_RESULT=unconfirmed` and `HANDOVER_WATCHING=10` (minutes) once the first result lands, then exits. The pid file stays while watching. A second `wait` blocks until the final result: `done`, `not-accepted`, or `unconfirmed` with no `HANDOVER_WATCHING` line. `open` refuses while a watch runs, as for any open link.

The late notification uses `completionId` + `:late`, so the chat's once-per-completion rule treats it as a new event. The skill text tells the agent: on `unconfirmed` with `HANDOVER_WATCHING`, tell the person *still checking, don't pay again*, run `wait` again in the background, and send the browser nothing.

### Unknown is not "not yet"

`finished()` stays pure. The send and watch loops track a separate `unknown` flag from `seen()` (null url / NaN count) that blocks any undo. The 60 s wait itself is unchanged by an unknown read: it just isn't a refusal.

### Progress on the phone

`sendForm` takes an `onStep(name)` hook: `typing`, `pressing`, `waiting`. The watcher keeps the current step, and `/receipt` while sending answers `202 { finishing, step }`. Today the page polls `/receipt` only after `/send` fails. It now polls it every 500 ms beside the pending `/send` and sets the status line from `step`. No value or target crosses that route.

Endings in `form-page.mjs`:

- `done`: *Sent*, as today.
- `unconfirmed`: *Sent, waiting for the site*, with *Don't pay again. Your chat will say how it went.*
- `not-accepted`: *Not accepted*, with *The site kept its page. Back to your chat to see what it said.* The old *nothing is sent again* line is gone.

### Timing record

A new `~/.wong-stack/hand-over/timings.jsonl`, mode 0600. It holds one JSON line per event:

- `{ at, link, step, index?, kind?, ms, ok }` for each fill, the press, and the finish wait.
- `{ at, link, ended, cause }` for each link ending. `cause` is one of `send`, `close-command`, `SIGTERM`/`SIGINT`/`SIGHUP`, `cancel-route`, `deadline`, `error`, `gave-way`.

`link` is the completionId's first 8 hex characters, and `kind` is the autofill name. There's no value, no label beyond kind, and no error message, since camofox's type errors can quote text. The file is trimmed to the last 500 lines on each write. It lives beside `result.json` and is never committed.

### Poll interval

`SEND_POLL_MS` is 500 ms during the first minute, an env override like the others. `POLL_MS` (2 s) stays for idle and watch loops. Each poll is one `evaluate`. At 500 ms that adds little load, and it queues behind the click lock anyway.

### Measure, then fix

Timing a practice checkout comes first: a local page with a cross-origin iframe card box and a submit that navigates client-side after a delay, through camofox. Then the change takes the fixes the record supports. Likely candidates, each kept only if measured:

- the press waiting on camofox's post-click ref rebuild;
- fills that wait on `assertLocatorFillable` plus `fill` per iframe box.

A fix that needs camofox config (such as `HANDLER_TIMEOUT_MS`) is weighed against its tab-destroy risk in the task notes.

## Measurements

Taken 2026-10-21 on the practice checkout ([`practice-checkout.mjs`](../../../scripts/tests/fixtures/practice-checkout.mjs)) through this computer's camofox 1.18.1, in a session of its own. Its card boxes sit in a cross-origin frame, and Pay switches to `/receipt/1` without a reload. Step times come from `timings.jsonl`; the send's round trip is `/send` timed with curl.

**Steps, 5 s site, new code (four runs).**

| Step | Time |
|-|-|
| Three fills (card number, expiry, CVC in the frame) | 180 ms total on the first run (107, 42, 31 ms) |
| Press, sent to camofox's answer | 1,816 ms on a cold tab, then 697, 714, 671 ms |
| Finish wait, from the press being sent | 6,452 ms cold, then 5,304, 5,298, 5,225 ms |

A single address read (`evaluate`) takes about 10 ms once warm, and a count about 4 ms. The press's 0.7 s is camofox's own: Playwright's click, its fixed 500 ms pause, and the ref rebuild over every frame. Fills are not slow.

**Before and after, 5 s site, `/send` round trip (three runs each).**

| Code | Runs | Over the site's 5 s |
|-|-|-|
| Before (`main`: 2 s polls, clock after the press returns) | 7,197 · 6,977 · 7,043 ms | about 2.0 s |
| After (500 ms polls, clock at the press) | 5,731 · 5,756 · 5,609 ms | about 0.7 s |

**The watch, real camofox.** A 90 s site: `unconfirmed` with `HANDOVER_WATCHING=10` at 60.0 s after the press, then `done` in the second `wait` 30.1 s into the watch; an `open` during the watch was refused. A site that never answers, with `HANDOVER_WATCH_MS=20000`: `unconfirmed` at 60.3 s, then `not-accepted` after the 20.2 s watch, the three card boxes empty in the next snapshot. No practice tunnel was left running.

**Fixes the record supports.** Only the two already in this change: polling every 500 ms and starting the clock at the press, which cut about 1.3 s from every send. What remains is camofox's press, about 0.7 s, and the site's own time. Cutting the press would need camofox config or source; its `HANDLER_TIMEOUT_MS` only bounds the press, and raising it would delay the tab-destroy on a hung click without making a normal press faster, so this change leaves it alone.

## Risks / Trade-offs

- [A declined card now takes up to ten minutes to read as *Not accepted*] → The chat says *still checking, don't pay again* at one minute, and `close` ends the watch early when the person reports a decline.
- [A watcher alive for ten minutes after the tunnel closes] → It's the same detached process as today, it exits at `WATCH_MS`, and a second `close` ends it.
- [The unconfirmed-then-moved case leaves card digits in a page's boxes the agent might later snapshot] → The page moved, so the boxes are gone or detached. The skill text says to read the address first and to snapshot only once the card frames' count is 0.
- [The change to the two-step `wait` protocol] → Older chats only ever see one result per completion. The second `wait` is opt-in through the skill text, and an agent that skips it still gets the late notification.

## UX

**Brief.** The person is on a phone, paying through the private form while the agent waits in the chat. They're done when they know whether they paid. Usually the site answers in seconds. The edge case is a slow site or a decline. The closest screen is today's form-page ending.

**Flow.** Tap Pay, then see the step line (*Typing your details… → Pressing Pay… → Waiting for the site…*), then one of three endings. Nothing else to tap.

**Hierarchy.** The ending's title is the one thing to read. The hint under it says what to do next, and only *still checking* tells them not to act.

**Components.** The existing `#status` line and the `#ended` title and hint. Nothing new.

### Review

[review.html](review.html) sketches the sending, still-checking, and not-accepted screens under the What Changes item *The phone says only what it knows*.
