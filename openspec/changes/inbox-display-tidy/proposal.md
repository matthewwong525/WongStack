# Tidy two inbox display details

**Status:** in-progress
**Branch:** inbox-display-tidy
**Open questions:** none

## Why

Two small things look off in the inbox. A plan shows two light and dark buttons, one in the app's bar and one on the review page, and they don't agree. On a phone, a long approval's top line is cut off with "…", so you can't read what it is.

## What Changes

- **One light and dark button on a plan.** The app's own button switches the whole screen, the review page included. The review page hides its own button inside the inbox and otherwise looks as it always does. Opened anywhere else, it keeps its button.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="muted">Now</span>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">lousy-dingo</span><span class="grow"/><button class="btn-ghost">Moon</button></div>
      <div class="sep"></div>
      <div class="row gap"><h3>Review</h3><span class="grow"/><button class="btn-ghost">Moon</button></div>
      <div class="bar"></div>
      <div class="skeleton"></div>
    </div>
    <div class="card col gap phone">
      <span class="muted">After</span>
      <div class="row gap"><button class="btn-ghost">Back</button><span class="muted">lousy-dingo</span><span class="grow"/><button class="btn-ghost">Moon</button></div>
      <div class="sep"></div>
      <h3>Review</h3>
      <div class="bar"></div>
      <div class="skeleton"></div>
    </div>
  </div>
  ```
- **A long approval's top line wraps on a phone.** "Publish the packaging page · lousy-dingo" runs onto a second line instead of ending in "…", and the page still never scrolls sideways.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="muted">Now</span>
      <div class="row gap"><span class="tag-outline danger">Risky</span><span class="muted">Publish the packaging pa…</span></div>
      <span>site · it wants to put the new page live</span>
      <button class="btn-ghost">1 Approve</button>
      <button class="btn-ghost">2 Don't approve</button>
    </div>
    <div class="card col gap phone">
      <span class="muted">After</span>
      <div class="row gap"><span class="tag-outline danger">Risky</span><span class="muted">Publish the packaging page · lousy-dingo</span></div>
      <span>site · it wants to put the new page live</span>
      <button class="btn-ghost">1 Approve</button>
      <button class="btn-ghost">2 Don't approve</button>
    </div>
  </div>
  ```

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: a plan inside the inbox follows the app's light or dark look and shows one switch.

## Impact

- `app/src/apps/inbox/PlanView.tsx` (sends the look with its greeting and when it changes), `app/src/apps/inbox/Decision.tsx` (who-line wraps), their tests.
- `.agents/skills/plan/references/review-kit.html` (hosted mode hides its switch and takes the inbox's look); payload file, so a `CHANGELOG.md` `## Next` entry.

## Decision log

**2026-10-22** — Asked what next after the inbox went live → chose *Tidy the small display details*: one light and dark button on a plan, and long approval titles wrap on a phone.
**2026-10-22** — Assumed: the app's button stays and the review page's goes inside the inbox, because the app bar is on every screen and a sealed frame can't save its own choice.
**2026-10-22** — Assumed: review pages built before this change still show their own button in the inbox, because they're files already on the computer; they ignore the new message.
**2026-10-22** — Built: the inbox sends its look with the greeting and on each switch; the page hides its own switch only inside the inbox; the approval line wraps. The second look found the release note marked patch for new behaviour → fixed to minor. Saved to check on the preview (task 3.2).
