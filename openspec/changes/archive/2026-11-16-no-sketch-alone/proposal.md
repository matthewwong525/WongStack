# A plan shows each screen as HTML in the app's real look

**Status:** ready-to-ship
**Branch:** review-shows-real-look
**Open questions:** none

## Why

A plan that changes a screen must show it as it will go live, so you decide once, before the build. Today there are two ways, and both fail you. A plan runs a copy of the app to take pictures, which is slow and often skipped. Or it falls back to a gray sketch, which only warns on the page, and one line of excuse stops the warning. In Relay Everything on 2026-11-10 and 2026-11-11, a plan gave an excuse ("the other change isn't live", "a test copy can't sign in") and showed a sketch.

## What Changes

- **Each screen is an HTML page in the app's real look.** The chat writes the screen as a page with the app's own colors, fonts, corners, and real words, with sample data. It runs no app. Below are the old sketch, the same Relay Everything screen written as HTML this way, and the real app:
  ```screen The old sketch
  <div class="card col gap phone">
    <h3>Settings</h3>
    <div class="card row gap"><b>R</b><div class="col grow"><b>you@example.com</b><span class="muted">Signed in</span></div><span class="muted">›</span></div>
    <div class="muted">Appearance</div>
    <div class="row gap"><span class="tag">System</span><span class="tag-outline">Light</span><span class="tag-outline">Dark</span></div>
    <div class="muted">Notes</div>
    <div>Pin notes to where I am</div>
    <div class="muted">Voice notes</div>
    <div class="row gap"><span class="grow">Speech model</span><button class="btn-ghost">Remove</button></div>
  </div>
  ```
  ```page
  As HTML: pages/settings.html
  ```
  ```picture
  The real app: pictures/real-settings.png
  ```
- **Before and After are both HTML.** *Before* is today's screen, written the same way, so the two differ only by the change. Each state the plan names, such as empty or loading, gets its own page. A screen you need to try, such as a drag, is a page with its own script, which you can tap and use on the review page.
- **The plan no longer runs a copy of the app.** The step that made a copy, put it online, or drew it with the app's screen test is gone, with its *Try it* link. The build makes each screen match the page you approved.
- **A plan can't show a screen as a sketch alone.** If the only picture of a screen is a sketch, the plan doesn't finish. Sign-in, missing data, or another change that isn't live yet are not reasons for a sketch: HTML needs none of them.
- **A sketch stays only for a part the phone or computer draws itself**, such as the keyboard or the share sheet, and only beside the real screen. Its label says *Sketch*, and it shows real words, never gray bars.

## What the build needs

- **Nothing.**

Non-goals: no change to the finished build's preview page, which still shows screenshots of the built app beside what you approved; no change to flow drawings, arrows, tables, ads, or website plans.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `review-pages`: a screen shows as HTML pages in the app's look, *Before* and *After*, with no app copy; a card never shows a screen as a sketch alone; the builder stops on one.
- `ux-wireframes`: a screen sketch has no gray bars and is labelled *Sketch*; a plan no longer sketches each screen by default.
- `apply`: the build matches each screen to the plan's approved page, in place of a prototype's diff.

## Impact

- `.agents/plugins/loop/skills/plan/scripts/build-review.mjs`: `sketchOnly` stops instead of warning, counts `page` and `live` as real, ignores `svg`; `bar` and `skeleton` leave `SCREEN_CLASSES`; an unlabelled `screen` picture is *Sketch*.
- `.agents/plugins/loop/skills/plan/scripts/look.mjs`: a `page` command writes the app's look, and the Tailwind classes a page uses, as a stylesheet beside the page.
- Removed: `.agents/plugins/loop/skills/plan/scripts/prototype.mjs` and `scripts/tests/prototype.test.mjs`; `scripts/retired-names.json` names it.
- `.agents/plugins/loop/skills/plan/references/prototypes.md`, `drawings.md`, `review-page.md`, `review-kit.html`; `.agents/plugins/loop/skills/apply/SKILL.md` and `references/build-helper.md`.
- `wiki/prototypes.md` (rewritten), `wiki/review-pages.md`, `wiki/ux-principles.md`, `wiki/README.md`.
- Tests: `review-pictures.test.mjs`, `review-browser.test.mjs`, `cli-conventions.test.mjs`, a `look.mjs` test.
- `CHANGELOG.md` minor entry.

## Decision log

- **2026-11-16** — Asked what happens to the step that runs a copy of the app for pictures → chose remove it: HTML in the app's real look is the only way, because running the app is too much work for a plan.
- **2026-11-16** — Assumed: *Before* is HTML too, not a screenshot of the live app, because the person asked for no app running, and two pages made the same way differ only by the change.
- **2026-11-16** — Assumed: a screen is a `page` card, or a `live` card when it needs a script to try, because both already carry local styles, fonts, and pictures, so no new card kind is needed.
- **2026-11-16** — Assumed: `look.mjs page` writes the app's colors and parts plus the Tailwind classes the page uses, compiled by the app's own Tailwind, because then a page can copy a screen's real class names and look the same; a phone or desktop app copies its theme's colors and fonts into the page's CSS by hand, as the Relay Everything sample does.
- **2026-11-16** — Assumed: the builder stops on a screen sketch with no picture, page, or live card beside it, and a "No real picture" line no longer lets it through, because that line is how the 2026-11-10 and 2026-11-11 plans got a sketch through.
- **2026-11-16** — Assumed: an `svg` fence alone still builds, because it draws arrows and layers, not screens.
- **2026-11-16** — Assumed: the gray `bar` and `skeleton` classes leave the `screen` fence, because a sketch now is only of a system part, which has real words.
- **2026-11-16** — Assumed: `/apply`'s preview page still screenshots the built app beside the approved page, because by then the app is built and running.
- **2026-11-16** — Assumed: `wiki/prototypes.md` keeps its name with new headings, because other pages link it; installed repos that link its old headings, such as Relay Everything's phone-picture steps, get an Updating note.
- **2026-11-16** — Assumed: the sample is Relay Everything's Settings screen, written as HTML with its colors from `mobile/lib/brand.dart` and its Inter font, beside the real screenshot from its settings-same-everywhere plan, with sample data only.
- **2026-11-16** — Check: `scripts/tests/prototype.test.mjs` is deleted with the script it tested, because plans no longer run a copy of the app.
- **2026-11-16** — Assumed: the real-Tailwind test of `look.mjs page` skips in CI when `app/` is not installed, as `access-openapi.test.mjs` does, because installing the app in the payload job would slow every run; the package-lookup and fallback tests always run.
- **2026-11-16** — Assumed: the public plan-first page is updated to say screens are HTML pages, because it still described the removed app copy.
- **2026-11-16** — Assumed: archive checkpoint on branch review-shows-real-look as release 61.9.0.
