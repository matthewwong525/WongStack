# A plan in the inbox fills the screen

**Status:** ready-to-ship
**Branch:** full-page-layout
**Open questions:** none

## Why

A plan opened in the inbox sits in a box with its own border and its own scroll, inside the app's page. It reads as a box in a box, and its *Send notes* bar floats above the screen's bottom instead of sitting on it.

## What Changes

- **The plan is the page.** Under *Back* and the workspace name, the plan runs edge to edge and down to the bottom of the screen, with no border or rounded corners. Its *Send notes / Build it / Build and publish* bar sits on the screen's bottom edge, like the app's own bar sits on its top. Notes, drawings opened full screen, and the light and dark switch work as before.
  ```screen
  <div class="row gap">
    <div class="col gap">
      <span class="muted">Now</span>
      <div class="col gap phone">
        <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">rabid-shrimp</span></div>
        <div class="card col gap">
          <h3>plan-without-asking</h3>
          <div class="bar"></div>
          <div class="skeleton"></div>
          <div class="sep"></div>
          <div class="row gap"><button class="btn-primary">Send notes</button><button class="btn-ghost">Build it</button></div>
        </div>
        <div class="bar"></div>
      </div>
    </div>
    <div class="col gap">
      <span class="muted">After</span>
      <div class="col gap phone">
        <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">rabid-shrimp</span></div>
        <h3>plan-without-asking</h3>
        <div class="bar"></div>
        <div class="skeleton"></div>
        <div class="sep"></div>
        <div class="row gap"><button class="btn-primary">Send notes</button><button class="btn-ghost">Build it</button></div>
      </div>
    </div>
  </div>
  ```

Non-goals: the review page's own look, its bar's size, and the inbox list stay as they are.

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a plan opened in the inbox fills the screen below its top row, with no frame of its own.

## Impact

- `app/src/apps/inbox/PlanView.tsx` (the frame's size and edges) and `PlanView.test.tsx`.
- The inbox ships to installs, so a `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

**2026-10-23** — Assumed: the plan runs the full width of the window, not only the app's centered column, because Matthew asked it to take up the page and the review page centers its own text anyway.
**2026-10-23** — Assumed: *Back*, the workspace name and the tap line stay above the plan, because they are the only way back to the list and the only word on a sent tap.
**2026-10-23** — Assumed: the plan keeps its own scroll inside the screen, not one long page that scrolls with the app, because its bottom bar, note box and full-screen drawings pin themselves to the plan's own window.
**2026-10-23** — Asked what next after seeing a mock of the full-screen plan → chose *Build and publish*.
**2026-10-23** — Built: the plan's view fills the window under the header and the frame runs full width with no border; the second look found nothing to fix. Saved to check on the preview (task 2.2).
**2026-10-23** — Preview check passed at 390 and 1280 px: the plan spans the window to its bottom edge with no border, the outer page doesn't scroll, and a note and a full-screen drawing open inside it. The inbox refuses the checker's machine sign-in, so a sample plan stood in for the inbox's answers.
**2026-10-23** — Archived for 44.9.4.
**2026-10-23** — Main moved to 44.10.0 (#445) mid-ship and the branch conflicted on the release note; merged main in and renumbered to 44.10.1.
