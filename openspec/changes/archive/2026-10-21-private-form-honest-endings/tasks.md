# Tasks

## 1. Measure first

- [x] 1.1 Build a practice checkout under `scripts/tests/fixtures/` (or a temp dir served locally): a main page with a cross-origin iframe holding card number, expiry, and CVC boxes, and a submit that switches pages client-side after a configurable delay (5 s and 90 s). Verify by opening it with `browse.mjs` and seeing the iframe boxes as refs in a snapshot.
- [x] 1.2 Add the timing record (`timings.jsonl`, 0600, last 500 lines, no values or error text) to `form.mjs`/`hand-over.mjs`: each fill, the press, the finish wait, and each link's ending cause. Verify with unit tests in `scripts/tests/form.test.mjs` and `hand-over.test.mjs` that a send records steps with `ms`, that no typed value appears in the file, and that trimming keeps 500 lines.
- [x] 1.3 Run a send on the practice checkout through camofox and note each step's time in the change's design (Measurements section). Verify the numbers come from `timings.jsonl`.

## 2. Honest endings in the send and the watch

- [x] 2.1 `form.mjs`: `sendForm` returns `done | not-accepted | unconfirmed`, undoes only when nothing was pressed, takes an `onStep` hook, and starts the wait clock at the press. Tests in `form.test.mjs`: a failed box returns `not-accepted` with undo; a press with no finish returns `unconfirmed` with no undo; an unreadable page never undoes.
- [x] 2.2 `hand-over.mjs`: on `unconfirmed`, end the link's input (receipt, tunnel, page server), notify the chat, and keep watching for `WATCH_MS` (10 min, env override) with keep-alives. A late finish ends `done` with a `:late` notification. At the end, undo and `not-accepted` only on an unmoved page, else final `unconfirmed`. `close` ends the watch by the same rule. `SEND_POLL_MS` is 500 ms during the first minute. Tests in `hand-over.test.mjs` with a fake page: a late finish, a moved page, an unreadable page, an unmoved page, and a close mid-watch.
- [x] 2.3 `wait` prints `HANDOVER_RESULT=unconfirmed` and `HANDOVER_WATCHING=10`, then a second `wait` prints the final result. `open` refuses during a watch. Update the usage text. Tests cover both `wait` calls and the refusal.
- [x] 2.4 Apply the speed fixes the measurements in 1.3 support (for example, how the press is sent), each re-timed on the practice checkout, with the before and after in the design's Measurements section. Verify the re-timed send is faster and the 2.1–2.3 tests still pass.

## 3. The phone page

- [x] 3.1 `/receipt` answers `202 { finishing, step }` while sending; `form-page.mjs` polls it beside `/send`, shows *Typing your details… / Pressing Pay… / Waiting for the site…*, and adds the *Sent, waiting for the site* ending. *Not accepted* drops "nothing is sent again". Tests in `form-page.test.mjs` for `ending()` on each result, and in `hand-over.test.mjs` that `/receipt` carries only the step name.

## 4. Docs and release

- [x] 4.1 `wiki/development/private-form.md`: what you see, the three endings, the watch and second `wait`, how the agent reads a moved page, and the timing record. `wiki/development/browsing.md`: what the helper reads. `.agents/skills/hand-over/SKILL.md` only if a line needs it. Verify with `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`.
- [x] 4.2 Add a `## Next (minor) — A payment form that never calls a slow payment refused` entry to `CHANGELOG.md`. Verify it sits at the top of the entries.

## 5. Verification

- [x] 5.1 Walk the practice checkout end to end through a real private link (a phone or curl to the tunnel): a 5 s site ends *Sent*, a 90 s site shows *still checking*, then a late *done* in `wait`, and a site that never moves ends *Not accepted* with emptied boxes after the watch (shortened with `HANDOVER_WATCH_MS`). Verify against `timings.jsonl` and the phone screens.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate private-form-honest-endings --strict --no-interactive`, then `/save` for CI.
