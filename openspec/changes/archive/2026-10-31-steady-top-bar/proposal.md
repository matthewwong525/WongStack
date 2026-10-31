# The app's top bar stays put

**Status:** ready-to-ship
**Branch:** goofy-crab
**Open questions:** none

## Why

Matthew said the top bar that hides and slides back on a plan in the inbox feels jerky. He wants the app's bar to stay at the top, and *Back* with the plan's name to scroll away with the plan, not stay pinned.

## What Changes

- **The app's bar stays at the top of every page.** It no longer hides when you read down a plan, and it no longer slides back over the plan when you scroll up. On the week board, Access, and every other page, it stays at the top as you scroll, as it did before 2026-10-25. The bar's slide was the problem, so a still picture of today's screen can't show it; the sketch stands alone.
  ```screen
  <div class="row gap">
    <div class="col gap phone">
      <span class="muted">Now: read down, then up a little</span>
      <span class="danger">the bar hides, then slides back over the plan</span>
      <div class="row gap"><span>WongStack</span><span class="muted">(slides in)</span></div>
      <span>…the line you were reading…</span>
    </div>
    <div class="col gap phone">
      <span class="muted">After: anywhere in the plan</span>
      <div class="row gap"><span>WongStack</span><span class="grow"></span><span class="muted">stays here</span></div>
      <span>…the line you were reading…</span>
      <span>…the next line…</span>
    </div>
  </div>
  ```

- **_Back_ and the plan's name scroll away with the plan.** They sit at the top of the plan's own page, above its title. When you read down, they go up and off the screen with the words, smoothly, and the plan never changes size. Scroll back to the top to see them again. A plan sent before this update keeps *Back* pinned above it until its chat rebuilds it.
  ```screen
  <div class="row gap">
    <div class="col gap phone">
      <span class="muted">At the plan's top</span>
      <div class="row gap"><span>WongStack</span></div>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">goofy-crab</span></div>
      <h3>The app's top bar stays put</h3>
      <span>Why</span>
    </div>
    <div class="col gap phone">
      <span class="muted">Read down</span>
      <div class="row gap"><span>WongStack</span></div>
      <span>…What Changes…</span>
      <span>…the line you were reading…</span>
      <span class="muted">Back went up with the page</span>
    </div>
  </div>
  ```

Non-goals: the plan's own bottom bar, the line about a sent tap, the week board's layout, and how a plan looks when opened on its own link outside the inbox stay as they are.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a plan's bars no longer hide or return on scroll; *Back* and the plan's name sit inside the plan's page and scroll with it.
- `mini-apps`: the app's top bar stays pinned at the top of every page instead of scrolling off.

## Impact

- `app/src/Layout.tsx` (the header is `sticky top-0` again; the `data-bars` classes go), `app/src/lib/bars.ts` (removed), `app/src/style.test.ts`.
- `app/src/apps/inbox/PlanView.tsx`, `frame.ts` and their tests: no more `inbox:scroll`; a new `inbox:back` message; the outer *Back* row shows only for a plan built before this change.
- `.agents/skills/plan/references/review-kit.html` and `scripts/tests/review.test.mjs`: in the inbox, the page shows *Back* and the workspace name at its top and stops reporting its scroll. The `one-review-standard` change (workspace odd-lion) also edits this file, in other parts; whichever lands second merges.
- `wiki/development/reply-links.md`: its *bars slide away* line says what a plan does now.
- Installs get it by their next sync, so a `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

- **2026-10-31** — Asked where the app's top bar should stay stuck at the top → chose every page.
- **2026-10-31** — Assumed: the app's bar never hides or slides on a plan, because Matthew said the slide is jerky; this reverses the 2026-10-25 choices in inbox-phone-fixes and only-the-app-bar-returns.
- **2026-10-31** — Assumed: *Back* and the plan's name move inside the plan's own page, so they scroll with its words, because hiding a row outside the plan when you leave its top would resize the plan and make it jump, which is the jerk he dislikes.
- **2026-10-31** — Assumed: a plan built before this change keeps *Back* pinned above it, because its page has no *Back* of its own; it gets the new one when its chat rebuilds it.
- **2026-10-31** — Assumed: the bar returns to its old look, slightly see-through with a blur, because that was the pinned bar before 2026-10-25 and it keeps a long page readable under it.
- **2026-10-31** — Assumed: no Before screenshot, because the problem is the bar's motion, which a still picture can't show.
- **2026-10-31** — Built: every task but the preview check; the second look found nothing to fix. The plan's page now marks its `<body>` with `data-own-back`, so `scripts/tests/preview-review.test.mjs` changed one expected line. Saved to check on the preview (task 5.2).
- **2026-10-31** — Checked on the preview at 390 px (saved 4be290b): the bar stays at the top on the week board, Access and a plan; *Back* and the workspace scroll away inside a fresh plan, which keeps its size, and *Back* opens the week board; an older plan keeps *Back* pinned and nothing slides. The plans were stand-ins served to the browser, because the preview's plan routes refuse the check's machine sign-in.
- **2026-10-31** — Archived to publish as 45.1.1; every task done.
- **2026-10-31** — Checked again on the archived commit (08e62c9), whose diff changes no app code: the bar stays at the top on the week board and Access at 390 px. That check is now kept as `mini-apps/reading-down-a-long-page`, so later changes replay it.
