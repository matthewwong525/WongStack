# Review notes update the plan and stop

**Status:** ready-to-ship
**Branch:** fix/review-copy-notes-auto-apply
**Open questions:** none

## Why

When you copy notes from a review page and paste them into chat, the assistant sometimes updates the plan and then goes straight on to build it. You never get to see the updated plan first. The copied text starts with `/continue`, which is the command for "pick this up and keep going", so building is what it was told to do.

## What Changes

- **Pasted notes change the plan, then stop.** The assistant updates the plan to match your notes and rebuilds the review page. Then it shows you the new page and asks *build it now?*, the same stop you get after any new plan.
  ```text
  review page
      │ Copy notes
      ▼
  paste in chat
      │
      ▼
  plan updated
  review page rebuilt
      │
      ▼
  "Build it now?" ◀── you decide
  ```
- **The copied text is a plain request.** No command at the top. It asks, in plain words, to update the plan and not build yet. Each note is a bullet that starts with where it points: the Why, a change number, or a decision number, plus a few words of that text.
  ```text
  before
  /continue add-login
  Review notes from review.html (2):
  1. #/2 · item "Save the…" — Say why.
  2. #/decisions/1 · decision "…" — …

  after
  Update the plan add-login with
  these notes from the review page.
  Don't build yet.
  - Change #2 ("Save the…"): Say why.
  - Decision #1 ("…"): …
  ```
- **The page says where the notes go.** After you tap Copy notes, the message reads *Paste them into chat to update the plan.*

**Non-goals:** No change to how you add, edit, or save notes on the page. Notes copied from a page made before this update are not treated specially. Notes are pasted where the plan is open; loading a saved plan elsewhere first is out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the copied block is a plain request to update the plan and not build, with one bullet per note by change number; pasted notes reconcile the plan and stop for review instead of implementing; the PR body requirement stops naming `/continue` for notes, matching the body `/save` writes today.
- `payload-checks`: the browser-test scenario names the copied request instead of the `/continue` block.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the copy block's header, its note lines, and the copy toast.
- `.agents/skills/plan/SKILL.md`: the description names pasted review notes; the Review notes section — skip the explore round, stop after the rebuild.
- `.agents/skills/continue/SKILL.md`: drops its pasted-review-block bullet.
- `scripts/retired-names.json`: retires the old marker `Review notes from review.html`.
- `scripts/tests/review-browser.test.mjs`: the copy test's expected block and toast.
- `openspec/specs/ux-wireframes/spec.md` (by delta, and its Purpose line directly), `openspec/specs/payload-checks/spec.md` (by delta), `wiki/ux-principles.md`.
- `VERSION` 25.3.0 → 25.4.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Assumed: the copied block starts with `/plan <change-name>` rather than plain words with no command, because an explicit command reliably loads the plan skill that owns the notes procedure, and you said the `/continue` start is probably not needed.
- **2026-09-27** — Assumed: after the notes are in, the assistant stops at the review link and asks *build it now?*, because that is the stop every new plan already makes, and building without a look is the bug.
- **2026-09-27** — Assumed: the notes procedure stays in the plan skill's Review notes section rather than a new reference file, because it is one paragraph and the fix is its stop, not its size.
- **2026-09-27** — Assumed: `/continue` still accepts pasted notes and now stops after them, because review pages built before this release keep copying `/continue`.
- **2026-09-27** — Assumed: the marker line `Review notes from review.html (<n>)` keeps its wording, because both skills recognize a pasted block by it, and old and new pages then match one rule.
- **2026-09-27** — Asked whether the copied text needs a command at the top → chose plain words: "Update the plan <name> with these notes from the review page. Don't build yet.", then one bullet per note by change number. This replaces the `/plan <change-name>` start above. The plan skill's description names these notes so it still loads.
- **2026-09-27** — Assumed: each bullet keeps a short quote of the text it points at, because a change number can shift when the plan is edited, and the quote lets the assistant find the right spot.
- **2026-09-27** — Asked, in a review note on change 4, whether older review pages need handling → chose no; the change is removed. Only the new copy format is recognized; `/continue` drops its review-block bullet, and the old marker is retired.
- **2026-09-27** — Asked, in a review note on change 5, whether notes need to work in a new session → chose no; the change is removed. Notes are handled where the plan is open, with no detour through `/continue`.
- **2026-09-27** — Assumed: no repeatable fact to distill, because the three session facts describe this change, and its one lasting rule (copied text is a plain request) now lives in the review kit, `/plan`, and [the UX principles](../../../wiki/ux-principles.md).
- **2026-09-27** — Assumed: archived and checkpointed for ship. Built as planned, plus a `payload-checks` delta and a direct `ux-wireframes` Purpose edit, both still naming `/continue`. The browser test waits for the copy toast, which is set after the clipboard write resolves. Released as 25.4.0, because 25.3.0 landed on main while this was planned.
