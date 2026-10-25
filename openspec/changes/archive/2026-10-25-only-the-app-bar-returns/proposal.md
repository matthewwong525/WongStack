# Only the app's bar comes back on a plan

**Status:** ready-to-ship
**Branch:** sticky-header-behavior
**Open questions:** none

## Why

Matt said that when he scrolls back up a plan in the inbox, the bars that return push the whole plan down. Both the app's bar and the *Back* row come back, so the jump is big and the line he was reading moves. He wants the app's bar to come back, but *Back* and the plan's name should stay at the top of the plan.

## What Changes

- **Scrolling up a plan brings back only the app's bar, laid over the plan.** The bar slides in on top of the plan's first lines, so nothing on the plan moves. *Back* and where the plan came from stay at the very top of the plan: you see them when you scroll back to the top, not on every scroll up. Reading down still hides everything, as today. A plan sent before this update keeps today's behavior until its chat rebuilds it.
  ```screen
  <div class="row gap">
    <div class="col gap phone">
      <span class="muted">Now: scroll up</span>
      <div class="row gap"><span>WongStack</span></div>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">gentle-husky</span></div>
      <span class="danger">↓ the plan jumps down two rows</span>
      <span>…the line you were reading…</span>
    </div>
    <div class="col gap phone">
      <span class="muted">After: scroll up</span>
      <div class="row gap"><span>WongStack</span><span class="muted">(over the plan)</span></div>
      <span>…the line you were reading, in the same place…</span>
    </div>
    <div class="col gap phone">
      <span class="muted">After: at the top</span>
      <div class="row gap"><span>WongStack</span></div>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">gentle-husky</span></div>
      <h3>The plan's title</h3>
    </div>
  </div>
  ```

Non-goals: the plan's own bottom bar, the line about a sent tap, and the app's bar on other pages stay as they are.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: scrolling up a plan brings back only the app's bar, over the plan; the top row returns only at the plan's top.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the page also tells the inbox when it is at its top.
- `app/src/apps/inbox/frame.ts`, `PlanView.tsx`, `app/src/lib/bars.ts`, `app/src/Layout.tsx`, and their tests.
- Installs get it by their next sync, so a `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

- **2026-10-25** — Assumed: the returning bar slides over the plan rather than pushing it down, because Matt ran publish without picking and it is the choice that stops the plan moving, which was his complaint.
- **2026-10-25** — Assumed: *Back* and the plan's name show only at the plan's top, because Matt asked that they not stick and they are outside the plan's own scrolling page.
- **2026-10-25** — Assumed: a plan built before this update keeps today's behavior, because its page doesn't say when it is at the top.
- **2026-10-25** — Built: the page stays at its top until the reader turns down, so creeping a few px past the top zone doesn't hide *Back* or move the plan; the second look caught it.
- **2026-10-25** — Assumed: when a plan shows the line about a sent tap, the returning bar covers that line until the next read down or the top, because it shows in both places and moving it would move the plan again.
- **2026-10-25** — Archived to publish as 44.15.4; every task done. The local pre-check's script tests failed three runs on unrelated timing tests (`live-line.test.mjs`, `hand-over.test.mjs`), a different one each run, each passing alone on a loaded machine; the online checks decide.
