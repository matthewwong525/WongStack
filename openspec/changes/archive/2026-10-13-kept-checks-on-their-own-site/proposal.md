# Kept checks replay on their own site

**Status:** ready-to-ship
**Branch:** kept-checks-on-their-own-site
**Open questions:** none

## Why

Before each publish, the assistant replays the saved checks of older features against the change's preview. Two of those checks belong to the landing page, which is a separate site with its own preview. The replay opened them on the app's preview, found none of the landing page there, and called both broken. That happened on three publishes in a row, each on a change that never touched the landing page, and each time they had to be explained away by hand.

## What Changes

- **A saved check remembers which site it belongs to.** Most belong to the app and say nothing. A check recorded on a second site, such as the landing page, carries that site's name. The replay opens each check on its own site's preview.
  ```text
    BEFORE                  AFTER
  app checks ──▶ app      app checks ──▶ app
                 preview                 preview
  landing    ──▶ app      landing    ──▶ +landing
  checks         preview  checks          preview
                 ✗ "broken"               ✓ replayed
  ```
- **No preview of that site, no replay.** A change that leaves the landing page alone gets no landing-page preview. Its checks are then listed as not run, with the reason that no landing-page address was posted for this change. They are never called broken, cost no time from the two-minute limit, and never count as a pass.
  ```text
  change touches     landing-page
  the landing page?  checks
  ─────────────────┼──────────────────────
  yes              │ replayed on its preview
  no               │ not run: no preview
  ```
- **The second site never gets the app's login key.** The replay sends the app's sign-in key only to the app's preview. A second site is opened as any visitor would open it.
- **The two landing-page checks are marked as the landing page's.** Nothing else about them changes.
- **Recording a check on a second site keeps its name.** When the assistant checks a landing-page change and saves the check, the file records the site, so the next publish replays it in the right place.

**Non-goals:** Building a landing-page preview for every change, replaying against the live landing page, or changing what the app's own checks do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: A kept check may name the site it was recorded on; the replay resolves that site's preview for the saved revision, withholds the app's Access credentials from it, and reports a check with no such preview as not run.

## Impact

`verify-journeys.mjs` (the kept-check file format, `keep`, `replay`) and its tests, the two files under `.agents/verification/journeys/landing-site/`, one clause in the walkthrough reference, the kept-checks and landing-page wiki pages, and a minor payload release. Reading a site's preview address uses the `gh` login the save step already needs. No app code, data, or dependency changes.

## Decision log

- **2026-10-13** — Asked what to do next after publishing the first-app message → chose "Fix the replay so the two landing-page checks run on their own preview".
- **2026-10-13** — Assumed: A change with no landing-page preview lists those checks as not run, because the landing page only gets a preview when a change touches it, and building one for every change would add checks that can't fail to every publish.
- **2026-10-13** — Assumed: The check names the commit status that carries its site's preview address (`landing-preview` here), because the landing page's own workflow already posts its address that way and the kept file must hold no address.
- **2026-10-13** — Assumed: The replay looks the address up itself, because a step the assistant must remember each publish is how the checks were misread three times.
- **2026-10-13** — Assumed: The app's sign-in key is never sent to a second site, because that site's address comes from a commit status, which is a weaker source than the app's own preview.
- **2026-10-13** — Assumed: The fix is general, not a special case for the landing page, because the replay script ships to every install and the landing page does not.
- **2026-10-13** — Asked what to do with the finished plan → chose "Build and publish".
- **2026-10-13** — Assumed: The not-run reason names the status, as in *no landing-preview address was posted for this change*, because the script knows only that name and "no landing-preview preview" read as a slip.
- **2026-10-13** — Archived checkpoint: built the `site` field, the address lookup, the credential-free visit and `keep --site`, with tests against a second practice site; marked the two landing-page checks; local checks passed, ready for the publishing checks. The same-or-changed path on a real landing preview stays unproven until a change touches the landing page.
- **2026-10-13** — Archived checkpoint: on the preview the two landing-page checks read not run with the reason and opened no page; given the landing practice site's address by hand, both replayed unchanged. One key-access check ran slow, passed a fresh look, and was kept again.
