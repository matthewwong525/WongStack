# The inbox reads well on a phone

**Status:** ready-to-ship
**Branch:** pumped-parrot
**Open questions:** none

## Why

Matt opened a question from the daily's link on his iPhone and saw raw code instead of a question: braces, quote marks and `\n\n`. Back in the inbox, long answers ran off the right edge of the screen, so he couldn't read them. On a plan, the app's bar and the *Back* row stay pinned at the top, taking room he wants for reading.

## What Changes

- **A question opened by its own link shows as a question.** The page shows the same card as the inbox: the question and its detail, one button per answer, and the *Or type your own answer* box, with a *Send* under it. An approval or a morning plan card opened by its link shows its own card the same way. A plan still opens as its review page.
  ```screen
  <div class="row gap">
    <div class="col gap phone">
      <span class="muted">Now</span>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">finicky-bullfrog</span></div>
      <span class="muted">{"text":"Pre-order chat: ship the doc fix and close, or set up the HP box and kits now?\n\nSteps 1-4 ...","options":["Ship the doc fix (PR #1856) and close this chat; ...", ...]}</span>
    </div>
    <div class="col gap phone">
      <span class="muted">After</span>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">finicky-bullfrog</span></div>
      <div class="card col gap">
        <span class="muted">Pre-order chat · finicky-bullfrog</span>
        <h3>Pre-order chat: ship the doc fix and close, or set up the HP box and kits now?</h3>
        <span>Steps 1-4 ...</span>
        <button class="btn-ghost">1 Ship the doc fix (PR #1856) and close this chat; the kits wait for another day</button>
        <button class="btn-ghost">2 Set up the HP box and the kits now</button>
        <input placeholder="Or type your own answer">
      </div>
      <div class="row gap"><span class="muted grow">1 of 1 picked</span><button class="btn-primary">Send 1 answer</button></div>
    </div>
  </div>
  ```

- **Long answers wrap inside the card.** Each answer button grows to as many lines as its words need, and stays inside the card and the screen at phone width.
  ```screen
  <div class="row gap">
    <div class="col gap phone">
      <span class="muted">Now</span>
      <div class="card col gap">
        <h3>Ship the doc fix and close, or set up the HP box?</h3>
        <div class="row"><button class="btn-ghost">1 Ship the doc fix (PR #1856) and close thi</button><span class="danger">→ off screen</span></div>
        <div class="row"><button class="btn-ghost">2 Set up the HP box and the kits now, befor</button><span class="danger">→ off screen</span></div>
      </div>
    </div>
    <div class="col gap phone">
      <span class="muted">After</span>
      <div class="card col gap">
        <h3>Ship the doc fix and close, or set up the HP box?</h3>
        <button class="btn-ghost">1 Ship the doc fix (PR #1856) and close this chat; the kits wait for another day</button>
        <button class="btn-ghost">2 Set up the HP box and the kits now, before the pre-orders open on Monday</button>
      </div>
    </div>
  </div>
  ```

- **On a plan, the top bars slide away while you read.** Scrolling down a plan hides the app's bar and the *Back* row, so the plan takes the whole screen. Scrolling up, or reaching the top, brings them back. On every other page the app's bar is no longer pinned: it scrolls off with the page. A plan sent before this update keeps today's pinned bars until its chat rebuilds it.
  ```mermaid
  stateDiagram-v2
    direction LR
    shown: Bars shown
    hidden: Plan fills the screen
    shown --> hidden: scroll down
    hidden --> shown: scroll up, or back at the top
  ```

- **A phone-width check guards the answers.** A test opens the inbox in a real browser 390 px wide and fails if a long answer leaves the card or the screen.

Non-goals: how the daily writes its questions, the review page's own bottom bar, and the inbox list's order and groups stay as they are.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: an item opened by its own link shows its card, not its raw body; a decision's choices wrap inside the card; a plan's top bars hide while the person scrolls down it.
- `mini-apps`: the app's top bar scrolls off with the page instead of staying pinned.

## Impact

- `app/src/apps/inbox/`: `PlanView.tsx` (non-plan items show their card), `List.tsx` (a one-item mode), `Decision.tsx` (choice rows merge their classes), `frame.ts` (a new `inbox:scroll` message), and their tests.
- `app/src/Layout.tsx` (the bar stops being sticky and can be tucked) and `app/src/style.test.ts`.
- `.agents/skills/plan/references/review-kit.html`: in the inbox, the page reports which way it scrolls.
- A new real-browser test setup in `app/` (Vitest browser mode with Playwright, using the machine's Chrome): new dev dependencies and a `test:browser` script in `npm test`.
- Installs get all of this by their next sync, so a `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-10-25** — Asked how the test should check that long answers wrap on a phone → chose a real browser at 390 px.
- **2026-10-25** — Asked how a plan should get more room to read on the phone → chose bars that hide while scrolling down a plan, with the app's bar unpinned on every other page.
- **2026-10-25** — Assumed: an approval and a morning plan card opened by their link get their card too, not only a question, because the daily's links open any item the same way and each would show raw code today.
- **2026-10-25** — Assumed: the item page reuses the inbox list's own card and *Send* bar, not a second copy of them, because a second copy goes stale.
- **2026-10-25** — Assumed: the question's later paragraphs show as the card shows them today, under the question, because the daily folds its detail into the question's words and Matt asked for it to look like the card.
- **2026-10-25** — Assumed: a link item and an agent's status opened by their link show their list card, with no *Send*, because they take no answer.
- **2026-10-25** — Assumed: the real-browser test skips with a clear line on a computer with no Chrome but fails in CI, because installs run `npm test` on machines that may lack Chrome, while CI always has it.
- **2026-10-25** — Assumed: the Access app's side panel keeps starting under the bar's place on wide screens, because it locks the page's scroll while open; checked on the preview.
- **2026-10-25** — Check: `app/package.json` adds a browser step to `npm test` that skips with one line on a computer with no Chrome, because installs may lack Chrome; with `CI` set it fails instead.
- **2026-10-25** — Check: `app/vitest.config.ts` excludes `src/**/*.browser.test.tsx`, because `app/vitest.config.browser.ts` runs those in a real browser.
- **2026-10-25** — Check: `app/vitest.config.browser.ts` is a new browser suite with no coverage, because it checks layout only and the main suite holds coverage.
- **2026-10-25** — Check: `app/knip.jsonc` reads the new browser config, so its test files count as used.
- **2026-10-25** — Built: every task but the preview checks; the tracking of scroll resets when the window's height changes, so tucking the bars near a plan's bottom doesn't bring them straight back.
- **2026-10-25** — Saved to check on the preview (task 6.3): the second look's three fixes are in (bars return after a plan reloads, browser-test screenshots ignored, a sample long question seeded for Fay).
- **2026-10-25** — Checked on the preview at 390 px: a question opened by its link shows its card and sends, long answers wrap in the list with no sideways scroll, a plan's bars hide on reading down and return on scroll up and at the top, and the list's bar scrolls away. The seeded question has two answers, not the scenario's three.
- **2026-10-25** — Asked how to go on when Access's side panel couldn't be checked after the preview's sign-in ran out → chose to publish and note it. The panel keeps `sm:top-14`, so a strip may show above it when opened lower down the page; task 3.7 waits for someone to see it.
- **2026-10-25** — Seen on the preview, not fixed here: tapping a heading link such as *Changes* inside a plan in the inbox blanks the plan's frame, likely because the page's `#` links resolve against the inbox's address.
- **2026-10-25** — Archived to publish as 44.14.0; every task done, the side panel check skipped as chosen.
